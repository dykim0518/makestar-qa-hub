export type CoverageHeuristicArgs = {
  apply: boolean;
  excludePagePathPrefixes: string[];
  product: string | null;
  specFiles: string[];
};

export type CoverageHeuristicFeatureLike = {
  pagePath: string;
};

export function parseCoverageHeuristicArgs(
  argv: string[],
): CoverageHeuristicArgs {
  const args: CoverageHeuristicArgs = {
    apply: false,
    excludePagePathPrefixes: [],
    product: null,
    specFiles: [],
  };

  for (const arg of argv) {
    if (arg === "--apply") {
      args.apply = true;
      continue;
    }
    if (arg.startsWith("--product=")) {
      const product = arg.slice("--product=".length).trim();
      if (product.length === 0) {
        throw new Error("--product 값이 비어 있습니다.");
      }
      args.product = product;
      continue;
    }
    if (arg.startsWith("--spec=")) {
      const specFile = arg.slice("--spec=".length).trim();
      if (specFile.length === 0) {
        throw new Error("--spec 값이 비어 있습니다.");
      }
      args.specFiles.push(specFile);
      continue;
    }
    if (arg.startsWith("--exclude-page-path-prefix=")) {
      const prefix = arg
        .slice("--exclude-page-path-prefix=".length)
        .trim();
      if (prefix.length === 0) {
        throw new Error("--exclude-page-path-prefix 값이 비어 있습니다.");
      }
      args.excludePagePathPrefixes.push(prefix);
      continue;
    }

    throw new Error(`지원하지 않는 옵션입니다: ${arg}`);
  }

  return args;
}

export function describeCoverageHeuristicScope(
  args: CoverageHeuristicArgs,
): string | null {
  const parts: string[] = [];
  if (args.product) parts.push(`product=${args.product}`);
  if (args.specFiles.length > 0) parts.push(`spec=${args.specFiles.join(",")}`);
  if (args.excludePagePathPrefixes.length > 0) {
    parts.push(`exclude=${args.excludePagePathPrefixes.join(",")}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function filterCoverageHeuristicFeaturesByPagePathPrefix<
  T extends CoverageHeuristicFeatureLike,
>(features: T[], excludePagePathPrefixes: string[]): T[] {
  return features.filter((feature) =>
    excludePagePathPrefixes.every(
      (prefix) => !feature.pagePath.startsWith(prefix),
    ),
  );
}
