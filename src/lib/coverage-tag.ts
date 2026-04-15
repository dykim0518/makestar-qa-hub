const FEATURE_TAG_RE = /@feature:([a-zA-Z0-9._-]+)/g;

export function extractFeatureTags(title: string): string[] {
  const matches = title.matchAll(FEATURE_TAG_RE);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}
