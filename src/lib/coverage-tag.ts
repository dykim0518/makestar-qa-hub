const FEATURE_TAG_RE = /@feature:([a-zA-Z0-9._-]+)/g;
const FEATURE_TAG_TOKEN_RE = /^@?feature:([a-zA-Z0-9._-]+)$/;

export function extractFeatureTags(title: string): string[] {
  const matches = title.matchAll(FEATURE_TAG_RE);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}

export function normalizeFeatureTag(tag: string): string | null {
  const normalized = tag.trim();
  const match = FEATURE_TAG_TOKEN_RE.exec(normalized);
  return match?.[1] ?? null;
}

export function extractFeatureTagsFromList(
  tags: Iterable<string | null | undefined>,
): string[] {
  const featureTags = new Set<string>();
  for (const tag of tags) {
    if (!tag) continue;
    const normalized = normalizeFeatureTag(tag);
    if (normalized) {
      featureTags.add(normalized);
    }
  }
  return Array.from(featureTags);
}
