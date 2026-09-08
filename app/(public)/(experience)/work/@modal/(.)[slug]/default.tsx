// Fallback for this parallel-route slot whenever the current URL doesn't match the intercepted
// [slug] modal page itself (e.g. a soft nav to the now-redirect-only /work/[slug]/case-study
// URL) — nothing to show in the modal slot in that case.
export default function Default() {
  return null;
}
