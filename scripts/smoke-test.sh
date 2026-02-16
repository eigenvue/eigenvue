#!/usr/bin/env bash
# =============================================================================
# Post-Deployment Smoke Tests — Eigenvue
#
# Verifies that key URLs on the live site return HTTP 200 responses.
# Run after every deployment to catch configuration errors.
#
# USAGE:
#   bash scripts/smoke-test.sh https://eigenvue.web.app
#   bash scripts/smoke-test.sh http://localhost:3000
#
# TESTED URLS:
#   - / (landing page)
#   - /algorithms (catalog)
#   - /algo/binary-search (representative classical algorithm)
#   - /algo/self-attention (representative GenAI algorithm)
#   - /algo/backpropagation (representative DL algorithm)
#   - /sitemap.xml
#   - /robots.txt
#
# EXIT CODES:
#   0  All URLs returned 200.
#   1  One or more URLs failed.
#
# Author: Ashutosh Mishra
# =============================================================================

set -euo pipefail

BASE_URL="${1:?Usage: $0 <base-url>}"

# Remove trailing slash.
BASE_URL="${BASE_URL%/}"

echo "Smoke Tests for: ${BASE_URL}"
echo "================================"

FAILURES=0

# List of URLs to test. Each line is a path.
URLS=(
    "/"
    "/algorithms"
    "/algo/binary-search"
    "/algo/self-attention"
    "/algo/backpropagation"
    "/docs"
    "/docs/getting-started/web-app"
    "/sitemap.xml"
    "/robots.txt"
)

for path in "${URLS[@]}"; do
    url="${BASE_URL}${path}"

    # Use curl with:
    #   -s  silent (no progress bar)
    #   -o /dev/null  discard body
    #   -w "%{http_code}"  print only the HTTP status code
    #   -L  follow redirects
    #   --max-time 10  timeout after 10 seconds
    #   --retry 2  retry twice on failure
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -L --max-time 10 --retry 2 "$url" || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        echo "  OK ${path} -> ${HTTP_CODE}"
    else
        echo "  FAIL ${path} -> ${HTTP_CODE}"
        FAILURES=$((FAILURES + 1))
    fi
done

echo ""
if [ "$FAILURES" -gt 0 ]; then
    echo "SMOKE TESTS FAILED: ${FAILURES} URL(s) returned non-200 responses."
    exit 1
fi

echo "ALL SMOKE TESTS PASSED."
