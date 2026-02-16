#!/usr/bin/env bash
# =============================================================================
# Bundle Size Gate — Eigenvue CI
#
# Parses the Next.js build manifest and fails if the shared first-load JS
# exceeds the configured threshold.
#
# USAGE (called by ci.yml):
#   BUNDLE_SIZE_LIMIT_KB=200 bash scripts/check-bundle-size.sh
#
# HOW IT WORKS:
#   After `next build`, Next.js writes build-manifest.json which lists the
#   JS files loaded on every page (rootMainFiles + polyfillFiles). This
#   script sums their gzipped sizes and compares to the limit.
#
#   Only shared first-load files are measured — route-specific code-split
#   chunks are excluded because they are loaded on-demand per route.
#
# EXIT CODES:
#   0  Bundle size is within the limit.
#   1  Bundle size exceeds the limit.
#
# Author: Ashutosh Mishra
# =============================================================================

set -euo pipefail

LIMIT_KB="${BUNDLE_SIZE_LIMIT_KB:-200}"
BUILD_DIR="web/.next"
MANIFEST="${BUILD_DIR}/build-manifest.json"

echo "Bundle Size Check"
echo "================="
echo "Limit: ${LIMIT_KB} KB (gzipped)"

if [ ! -f "$MANIFEST" ]; then
    echo "ERROR: Build manifest '${MANIFEST}' not found. Run 'npm run build' first."
    exit 1
fi

# ---------------------------------------------------------------------------
# Extract the shared first-load JS files from the build manifest.
#
# rootMainFiles:  JS loaded on every App Router page (webpack, shared chunks,
#                 main-app bootstrap).
# polyfillFiles:  Browser polyfills loaded on every page.
#
# These match the "First Load JS shared by all" metric in Next.js build output.
# ---------------------------------------------------------------------------

SHARED_FILES=$(node -e "
  const fs = require('fs');
  const manifest = JSON.parse(fs.readFileSync('${MANIFEST}', 'utf8'));
  const files = [
    ...(manifest.rootMainFiles || []),
    ...(manifest.polyfillFiles || []),
  ];
  // De-duplicate and print one file per line.
  [...new Set(files)].forEach(f => console.log(f));
")

TOTAL_SIZE_BYTES=0
FILE_COUNT=0

while IFS= read -r rel_path; do
    js_file="${BUILD_DIR}/${rel_path}"
    if [ -f "$js_file" ]; then
        GZ_SIZE=$(gzip -c "$js_file" | wc -c)
        TOTAL_SIZE_BYTES=$((TOTAL_SIZE_BYTES + GZ_SIZE))
        FILE_COUNT=$((FILE_COUNT + 1))
        echo "  $(( GZ_SIZE / 1024 )) KB - $(basename "$js_file")"
    fi
done <<< "$SHARED_FILES"

# Convert to KB.
TOTAL_SIZE_KB=$((TOTAL_SIZE_BYTES / 1024))

echo ""
echo "Measured first-load JS (gzipped): ${TOTAL_SIZE_KB} KB (${FILE_COUNT} files)"

if [ "$TOTAL_SIZE_KB" -gt "$LIMIT_KB" ]; then
    echo ""
    echo "::error::Bundle size ${TOTAL_SIZE_KB} KB exceeds limit of ${LIMIT_KB} KB."
    echo "Consider:"
    echo "  - Code splitting large components with dynamic imports"
    echo "  - Moving heavy layouts to lazy-loaded modules"
    echo "  - Reviewing recent dependency additions"
    exit 1
fi

echo "PASS: Bundle size is within the ${LIMIT_KB} KB limit."
