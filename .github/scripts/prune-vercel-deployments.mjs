// Keeps Vercel deployment count (and therefore Deployment/Functions Storage) from creeping
// back up on the Hobby plan, which has no built-in retention policy. Every push to main
// creates a new production deployment that Vercel otherwise keeps forever.
//
// Run by .github/workflows/prune-vercel-deployments.yml on a schedule.

const KEEP_MOST_RECENT = 5;
const API = "https://api.vercel.com";

const token = process.env.VERCEL_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;

if (!token || !projectId) {
  console.error("Missing VERCEL_TOKEN or VERCEL_PROJECT_ID");
  process.exit(1);
}

async function vercelFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} -> ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
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

function fmt(d) {
  const date = new Date(d.created).toISOString().slice(0, 16).replace("T", " ");
  return `${d.uid}  ${date}  ${(d.target || "preview").padEnd(10)}  ${d.state || d.readyState || "?"}  ${d.url}`;
}

async function main() {
  const deployments = await listAllDeployments();
  const sorted = [...deployments].sort((a, b) => b.created - a.created);

  const prod = sorted.find(
    (d) => d.target === "production" && (d.state === "READY" || d.readyState === "READY")
  );

  if (!prod) {
    console.error("Could not identify a current production deployment — aborting without deleting anything.");
    process.exit(1);
  }

  const keepIds = new Set(sorted.slice(0, KEEP_MOST_RECENT).map((d) => d.uid));
  keepIds.add(prod.uid);
  const toDelete = sorted.filter((d) => !keepIds.has(d.uid));

  console.log(`Total deployments: ${deployments.length}`);
  console.log(`Keeping: ${keepIds.size} (production + ${KEEP_MOST_RECENT} most recent)`);
  console.log(`Deleting: ${toDelete.length}\n`);

  let deleted = 0;
  let failed = 0;
  for (const d of toDelete) {
    try {
      await vercelFetch(`/v13/deployments/${d.uid}`, { method: "DELETE" });
      console.log(`deleted  ${fmt(d)}`);
      deleted++;
    } catch (e) {
      console.log(`FAILED   ${fmt(d)}  (${e.message})`);
      failed++;
    }
    await new Promise((r) => setTimeout(r, 300));
  }

  const summary = `## Vercel deployment prune\n\n- Total found: ${deployments.length}\n- Kept: ${keepIds.size}\n- Deleted: ${deleted}\n- Failed: ${failed}\n`;
  console.log(`\n${summary}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await import("node:fs").then((fs) => fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary));
  }

  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
