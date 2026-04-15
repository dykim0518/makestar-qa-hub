#!/usr/bin/env bash
# Git hooks 설치. 레포별 1회 실행 (버전관리되는 scripts/hooks/* → .git/hooks/*).
set -e

cd "$(dirname "$0")/.."
HOOKS_SRC="scripts/hooks"
HOOKS_DST=".git/hooks"

if [ ! -d "$HOOKS_DST" ]; then
  echo "❌ .git/hooks 디렉토리 없음 (git 레포 루트에서 실행 필요)"
  exit 1
fi

for hook in "$HOOKS_SRC"/*; do
  name=$(basename "$hook")
  cp "$hook" "$HOOKS_DST/$name"
  chmod +x "$HOOKS_DST/$name"
  echo "✓ $name 설치"
done

echo "✅ 훅 설치 완료"
