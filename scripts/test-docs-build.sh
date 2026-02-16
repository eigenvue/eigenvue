#!/usr/bin/env bash
# =============================================================================
# Eigenvue Documentation Build Smoke Test
#
# Verifies that the docs site builds successfully without errors.
# Run locally before pushing docs changes, and in CI as a pre-deployment check.
#
# USAGE:
#   bash scripts/test-docs-build.sh
#
# WHAT IT CHECKS:
#   1. docs/package.json exists
#   2. npm ci succeeds (dependencies install)
#   3. npm run build succeeds (Astro/Starlight builds without errors)
#   4. The dist/ directory is created with HTML files
#   5. Key pages exist in the output (index.html, getting-started/, algorithms/)
#
# EXIT CODES:
#   0  Build succeeded and key pages exist.
#   1  Build failed or key pages are missing.
# =============================================================================

set -euo pipefail

DOCS_DIR="docs"
DIST_DIR="${DOCS_DIR}/dist"

echo "Docs Build Smoke Test"
echo "====================="

# ---------------------------------------------------------------------------
# Step 1: Verify docs directory exists.
# ---------------------------------------------------------------------------
if [ ! -f "${DOCS_DIR}/package.json" ]; then
    echo "ERROR: ${DOCS_DIR}/package.json not found."
    exit 1
fi
echo "✓ package.json found."

# ---------------------------------------------------------------------------
# Step 2: Install dependencies.
# ---------------------------------------------------------------------------
echo "Installing dependencies..."
cd "$DOCS_DIR"
npm ci --silent
echo "✓ Dependencies installed."

# ---------------------------------------------------------------------------
# Step 3: Build the docs site.
# ---------------------------------------------------------------------------
echo "Building docs site..."
npm run build
BUILD_EXIT=$?
cd ..

if [ "$BUILD_EXIT" -ne 0 ]; then
    echo "ERROR: Docs build failed with exit code ${BUILD_EXIT}."
    exit 1
fi
echo "✓ Build succeeded."

# ---------------------------------------------------------------------------
# Step 4: Verify output directory exists.
# ---------------------------------------------------------------------------
if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: Output directory ${DIST_DIR} not found after build."
    exit 1
fi
echo "✓ Output directory exists."

# ---------------------------------------------------------------------------
# Step 5: Verify key pages exist.
# ---------------------------------------------------------------------------
FAILURES=0

check_file() {
    if [ -f "$1" ]; then
        echo "  ✓ $1"
    else
        echo "  ✗ MISSING: $1"
        FAILURES=$((FAILURES + 1))
    fi
}

echo "Checking key output files..."
check_file "${DIST_DIR}/index.html"
check_file "${DIST_DIR}/getting-started/web-app/index.html"
check_file "${DIST_DIR}/getting-started/python-package/index.html"
check_file "${DIST_DIR}/contributing/development-setup/index.html"
check_file "${DIST_DIR}/contributing/adding-an-algorithm/index.html"
check_file "${DIST_DIR}/api-reference/python-api/index.html"
check_file "${DIST_DIR}/api-reference/step-format/index.html"
check_file "${DIST_DIR}/algorithms/index.html"
check_file "${DIST_DIR}/algorithms/binary-search/index.html"
check_file "${DIST_DIR}/algorithms/self-attention/index.html"
check_file "${DIST_DIR}/research/citation/index.html"

echo ""
if [ "$FAILURES" -gt 0 ]; then
    echo "FAILED: ${FAILURES} key page(s) missing from build output."
    exit 1
fi

echo "All key pages present. Docs build smoke test PASSED."
