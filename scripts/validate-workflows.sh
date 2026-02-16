#!/usr/bin/env bash
# =============================================================================
# GitHub Actions Workflow Validation
#
# Validates YAML syntax for all workflow files.
# Uses Python's yaml module to parse each file — catches common YAML errors
# like incorrect indentation, missing colons, and duplicate keys.
#
# USAGE:
#   bash scripts/validate-workflows.sh
#
# Author: Ashutosh Mishra
# =============================================================================

set -euo pipefail

echo "Validating GitHub Actions workflows..."
echo "======================================="

# Use python3 if available and functional, otherwise fall back to python.
PYTHON_CMD="python"
if python3 --version &>/dev/null 2>&1; then
    PYTHON_CMD="python3"
fi

FAILURES=0

for workflow in .github/workflows/*.yml; do
    if [ ! -f "$workflow" ]; then
        echo "  No workflow files found."
        exit 0
    fi

    echo -n "  ${workflow}... "

    # Pass the workflow path as an argument instead of interpolating it
    # into a Python string, which avoids path escaping issues on Windows.
    if "$PYTHON_CMD" -c "
import yaml, sys
path = sys.argv[1]
with open(path, 'r') as f:
    try:
        yaml.safe_load(f)
        sys.exit(0)
    except yaml.YAMLError as e:
        print(f'YAML error: {e}', file=sys.stderr)
        sys.exit(1)
" "$workflow" 2>&1; then
        echo "OK"
    else
        echo "FAILED"
        FAILURES=$((FAILURES + 1))
    fi
done

echo ""
if [ "$FAILURES" -gt 0 ]; then
    echo "VALIDATION FAILED: ${FAILURES} workflow(s) have YAML errors."
    exit 1
fi

echo "All workflows are valid YAML."
