// Keeps Vercel deployment count (and therefore Deployment/Functions Storage) from creeping
// back up on the Hobby plan, which has no built-in retention policy. Every push to main
// creates a new production deployment that Vercel otherwise keeps forever.
//
// Run by .github/workflows/prune-vercel-deployments.yml on a schedule.
//
// Failure policy: this is a housekeeping job, so it only exits non-zero for problems a human
// must act on — a bad token, or an unidentifiable production deployment. A single deployment
// that refuses to delete (Vercel protects whatever an alias still points at) is reported and
// skipped, because one stuck deployment shouldn't abort the whole prune and leave the rest to
// accumulate. That was the previous behaviour: any failure at all meant exit 1.

const KEEP_MOST_RECENT = 5;
const API = "https://api.vercel.com";

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;

if (!token || !projectId) {
  console.error(
    `Missing credentials: VERCEL_TOKEN is ${token ? "set" : "EMPTY"}, ` +
    `VERCEL_PROJECT_ID is ${projectId ? "set" : "EMPTY"}. ` +
    `VERCEL_TOKEN comes from the repo secret of the same name — if it was rotated or deleted, ` +
    `create a new one at https://vercel.com/account/tokens and re-add it under ` +
    `Settings > Secrets and variables > Actions.`
  );
  process.exit(1);
}

class VercelError extends Error {
  constructor(status, path, body) {
    super(`${path} -> ${status}: ${JSON.stringify(body).slice(0, 300)}`);
    this.status = status;
    this.body = body;
  }
}

async function vercelFetch(path, opts = {}, { retries = 3 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;

    // Vercel rate-limits bulk deletes; back off rather than reporting dozens of false failures.
    if (res.status === 429 && attempt < retries) {
      const wait = Number(res.headers.get("retry-after")) * 1000 || (attempt + 1) * 2000;
      console.log(`  rate limited, waiting ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    throw new VercelError(res.status, `${opts.method || "GET"} ${path}`, body);
  }
}

// Fails fast with an unambiguous message, so an expired token can never be mistaken for
// "nothing to prune" or hide behind a pile of per-deployment errors.
async function assertTokenWorks() {
  try {
    const me = await vercelFetch("/v2/user");
    console.log(`Authenticated as: ${me.user?.username || me.user?.email || "unknown"}`);
  } catch (e) {
    if (e.status === 401 || e.status === 403) {
      console.error(
        `VERCEL_TOKEN was rejected (HTTP ${e.status}). The token is missing, expired, revoked, ` +
        `or lacks access to this project. Create a new one at ` +
        `https://vercel.com/account/tokens and update the VERCEL_TOKEN repo secret.\n  ${e.message}`
      );
      process.exit(1);
    }
    throw e;
  }
}

async function listAllDeployments() {
  let deployments = [];
  let next;
  do {
    const qs = new URLSearchParams({ projectId, limit: "100" });
    if (next) qs.set("until", String(next));
    const data = await vercelFetch(`/v6/deployments?${qs}`);
    deployments = deployments.concat(data.deployments || []);
    next = data.pagination?.next || null;
  } while (next);
  return deployments;
}

// The deployment the production domain actually points at, straight from the project record
// rather than inferred from list order — the newest READY production build isn't necessarily
// the one being served (a rollback, or a newer build that failed to alias).
async function currentProductionId() {
  try {
    const project = await vercelFetch(`/v9/projects/${projectId}`);
    return project.targets?.production?.id || project.targets?.production?.deploymentId || null;
  } catch (e) {
    console.log(`  (could not read project record: ${e.message})`);
    return null;
  }
}

function fmt(d) {
  const date = new Date(d.created).toISOString().slice(0, 16).replace("T", " ");
  return `${d.uid}  ${date}  ${(d.target || "preview").padEnd(10)}  ${d.state || d.readyState || "?"}  ${d.url}`;
}

// Vercel refuses to delete a deployment an alias still resolves to. That's a correct refusal,
// not a fault to fail the run over.
function isAliasProtected(e) {
  const text = JSON.stringify(e.body || {}).toLowerCase();
  return text.includes("alias") || text.includes("cannot be deleted") || text.includes("in use");
}

async function main() {
  await assertTokenWorks();

  const deployments = await listAllDeployments();
  const sorted = [...deployments].sort((a, b) => b.created - a.created);

  const prodId = await currentProductionId();
  const prod =
    sorted.find((d) => d.uid === prodId) ||
    sorted.find((d) => d.target === "production" && (d.state === "READY" || d.readyState === "READY"));

  if (!prod) {
    console.error(
      "Could not identify a current production deployment — aborting without deleting anything, " +
      "rather than risk removing whatever is serving the site."
    );
    process.exit(1);
  }
  console.log(`Current production: ${prod.uid} (${prod.url})`);

  const keepIds = new Set(sorted.slice(0, KEEP_MOST_RECENT).map((d) => d.uid));
  keepIds.add(prod.uid);
  const toDelete = sorted.filter((d) => !keepIds.has(d.uid));

  console.log(`Total deployments: ${deployments.length}`);
  console.log(`Keeping: ${keepIds.size} (production + ${KEEP_MOST_RECENT} most recent)`);
  console.log(`Deleting: ${toDelete.length}\n`);

  let deleted = 0;
  let skipped = 0;
  const failures = [];
  for (const d of toDelete) {
    try {
      await vercelFetch(`/v13/deployments/${d.uid}`, { method: "DELETE" });
      console.log(`deleted  ${fmt(d)}`);
      deleted++;
    } catch (e) {
      if (e.status === 401 || e.status === 403) {
        console.error(`Token rejected mid-run (HTTP ${e.status}) — stopping.\n  ${e.message}`);
        process.exit(1);
      }
      if (isAliasProtected(e)) {
        console.log(`skipped  ${fmt(d)}  (still aliased)`);
        skipped++;
      } else {
        console.log(`FAILED   ${fmt(d)}  (${e.message})`);
        failures.push(`${d.uid}: ${e.message}`);
      }
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const summary =
    `## Vercel deployment prune\n\n` +
    `- Total found: ${deployments.length}\n` +
    `- Kept: ${keepIds.size}\n` +
    `- Deleted: ${deleted}\n` +
    `- Skipped (still aliased): ${skipped}\n` +
    `- Failed: ${failures.length}\n` +
    (failures.length ? `\n<details><summary>Failures</summary>\n\n${failures.map((f) => `- ${f}`).join("\n")}\n\n</details>\n` : "");
  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await import("node:fs").then((fs) => fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary));
  }

  // A few unexpected per-deployment errors are surfaced in the log and step summary but don't
  // fail the job — the next scheduled run retries them, and a red X every morning for something
  // self-correcting trains you to ignore the one that matters. But if there was work to do and
  // *nothing* succeeded, that's systemic: fail, so it can't rot behind a green check.
  if (failures.length && deleted === 0 && skipped === 0) {
    console.error(
      `Every one of the ${failures.length} attempted deletions failed — treating as systemic ` +
      `rather than reporting success. First error: ${failures[0]}`
    );
    process.exit(1);
  }
  if (failures.length) {
    console.log(`Note: ${failures.length} deployment(s) could not be deleted; the next run will retry them.`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
