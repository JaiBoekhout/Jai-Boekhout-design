// A hard navigation straight to /work/[slug]/case-study (without ever passing through the
// intercepted /work/[slug] modal first) still needs this slot to resolve to *something* for
// the [slug] segment itself — the case-study child segment is what actually renders.
export default function Default() {
  return null;
}
