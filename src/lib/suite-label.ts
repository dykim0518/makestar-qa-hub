const SUITE_LABEL: Record<string, string> = {
  cmr: "CMR",
  albumbuddy: "앨범버디",
  admin: "통합매니저",
  all: "전체",
};

export function getSuiteLabel(suite: string): string {
  return SUITE_LABEL[suite] ?? suite;
}
