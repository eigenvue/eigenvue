#!/usr/bin/env bash
# =============================================================================
# Bundle Size Gate — Eigenvue CI
#
# Parses the Next.js build output and fails if the first-load JS bundle
# exceeds the configured threshold.
#
# USAGE (called by ci.yml):
#   BUNDLE_SIZE_LIMIT_KB=200 bash scripts/check-bundle-size.sh
#
# HOW IT WORKS:
#   After `next build`, Next.js writes build info to web/.next/build-manifest.json
#   and prints a route summary. This script finds the "First Load JS" size
#   from the build output directory and compares it to the limit.
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

echo "Bundle Size Check"
echo "================="
echo "Limit: ${LIMIT_KB} KB (gzipped)"

# ---------------------------------------------------------------------------
# Parse the route sizes from the Next.js build output.
# Next.js generates a build-manifest.json and outputs route sizes.
# We look for the largest "First load JS" value.
# ---------------------------------------------------------------------------

if [ ! -d "$BUILD_DIR" ]; then
    echo "ERROR: Build directory '${BUILD_DIR}' not found. Run 'npm run build' first."
    exit 1
fi

# Find all JS files in the static chunks directory and sum their gzipped sizes.
# This gives us the total first-load JavaScript size.
TOTAL_SIZE_BYTES=0

# Static chunks that are loaded on every page.
CHUNKS_DIR="${BUILD_DIR}/static/chunks"
if [ -d "$CHUNKS_DIR" ]; then
    for js_file in "$CHUNKS_DIR"/*.js; do
        if [ -f "$js_file" ]; then
            # Get gzipped size.
            GZ_SIZE=$(gzip -c "$js_file" | wc -c)
            TOTAL_SIZE_BYTES=$((TOTAL_SIZE_BYTES + GZ_SIZE))
        fi
    done
fi

# Convert to KB.
TOTAL_SIZE_KB=$((TOTAL_SIZE_BYTES / 1024))

echo "Measured first-load JS (gzipped): ${TOTAL_SIZE_KB} KB"

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
