// Required by parallel routes: on a hard navigation/refresh that doesn't match anything under
// this slot (e.g. landing on /work directly), Next needs a fallback for @modal so it doesn't
// 404 the whole route — see parallel-routes.md's "default.tsx" section.
export default function Default() {
  return null;
}
