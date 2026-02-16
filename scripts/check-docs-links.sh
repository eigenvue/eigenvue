#!/usr/bin/env bash
# =============================================================================
# Eigenvue Documentation Link Checker
#
# Checks for broken internal links in the built docs site.
# Scans all HTML files in docs/dist/ for <a href="..."> tags
# that reference internal paths, and verifies those paths exist.
#
# USAGE:
#   bash scripts/check-docs-links.sh
#
# PREREQUISITES:
#   The docs site must be built first: cd docs && npm run build
#
# EXIT CODES:
#   0  All internal links resolve.
#   1  One or more broken links found.
# =============================================================================

set -euo pipefail

DIST_DIR="docs/dist"

if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: ${DIST_DIR} not found. Build the docs first: cd docs && npm run build"
    exit 1
fi

echo "Checking internal links in ${DIST_DIR}..."

BROKEN=0
CHECKED=0

# Find all HTML files and extract internal links.
while IFS= read -r html_file; do
    # Extract href values that start with "/" (internal links).
    # Exclude external links (http://, https://, mailto:, #).
    links=$(grep -oP 'href="\K/[^"]*' "$html_file" 2>/dev/null || true)

    for link in $links; do
        CHECKED=$((CHECKED + 1))

        # Strip query params and anchors.
        clean_link=$(echo "$link" | sed 's/[?#].*//')

        # Resolve to a file path in dist/.
        # /getting-started/web-app/ → docs/dist/getting-started/web-app/index.html
        target="${DIST_DIR}${clean_link}"
        if [ -d "$target" ]; then
            target="${target%/}/index.html"
        fi

        if [ ! -f "$target" ] && [ ! -f "${target}.html" ]; then
            echo "  BROKEN: ${link}"
            echo "    in: ${html_file}"
            BROKEN=$((BROKEN + 1))
        fi
    done
done < <(find "$DIST_DIR" -name "*.html" -type f)

echo ""
echo "Checked ${CHECKED} internal link(s)."

if [ "$BROKEN" -gt 0 ]; then
    echo "FAILED: ${BROKEN} broken link(s) found."
    exit 1
fi

echo "All internal links are valid."
