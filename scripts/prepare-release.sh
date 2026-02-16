#!/usr/bin/env bash
# =============================================================================
# Eigenvue Release Preparation Script
#
# Automates the version bump, commit, and tag creation for a new release.
# After running this script, pushing the tag triggers PyPI publishing.
#
# USAGE:
#   ./scripts/prepare-release.sh <new-version>
#   ./scripts/prepare-release.sh 1.2.3
#
# WHAT IT DOES:
#   1. Validates the working tree is clean (no uncommitted changes).
#   2. Validates the version format (must be semver: X.Y.Z).
#   3. Updates the version in python/pyproject.toml.
#   4. Creates a commit: "release: v1.2.3"
#   5. Creates an annotated tag: v1.2.3
#   6. Prints instructions for pushing.
#
# WHAT IT DOES NOT DO:
#   - Push to remote (you do that manually after review).
#   - Modify web/package.json (web app doesn't have a user-facing version).
#   - Run tests (CI does that when the tag is pushed).
#
# Author: Ashutosh Mishra
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Input Validation
# ---------------------------------------------------------------------------

if [ $# -ne 1 ]; then
    echo "Usage: $0 <new-version>"
    echo "Example: $0 1.2.3"
    exit 1
fi

NEW_VERSION="$1"

# Validate semver format.
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    echo "ERROR: Version must be in semver format (e.g., 1.2.3 or 1.2.3-beta.1)."
    exit 1
fi

TAG_NAME="v${NEW_VERSION}"

# Check for clean working tree.
if [ -n "$(git status --porcelain)" ]; then
    echo "ERROR: Working tree is not clean. Commit or stash your changes first."
    git status --short
    exit 1
fi

# Check that we're on the main branch.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "WARNING: You are on branch '${CURRENT_BRANCH}', not 'main'."
    read -rp "Continue anyway? (y/N) " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 1
    fi
fi

# Check that the tag doesn't already exist.
if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo "ERROR: Tag '${TAG_NAME}' already exists."
    exit 1
fi

# ---------------------------------------------------------------------------
# Version Bump
# ---------------------------------------------------------------------------

PYPROJECT="python/pyproject.toml"

echo "Updating version in ${PYPROJECT} to ${NEW_VERSION}..."

# Use sed to replace the version line.
# Matches: version = "X.Y.Z" (with any previous version).
sed -i "s/^version = \".*\"/version = \"${NEW_VERSION}\"/" "$PYPROJECT"

# Verify the change.
UPDATED_VERSION=$(python3 -c "
import tomllib
with open('${PYPROJECT}', 'rb') as f:
    data = tomllib.load(f)
print(data['project']['version'])
")

if [ "$UPDATED_VERSION" != "$NEW_VERSION" ]; then
    echo "ERROR: Version update failed. Expected '${NEW_VERSION}', got '${UPDATED_VERSION}'."
    git checkout -- "$PYPROJECT"
    exit 1
fi

echo "Version updated to ${UPDATED_VERSION}."

# ---------------------------------------------------------------------------
# Commit and Tag
# ---------------------------------------------------------------------------

echo "Creating release commit..."
git add "$PYPROJECT"
git commit -m "release: v${NEW_VERSION}"

echo "Creating annotated tag ${TAG_NAME}..."
git tag -a "$TAG_NAME" -m "Release ${TAG_NAME}"

# ---------------------------------------------------------------------------
# Instructions
# ---------------------------------------------------------------------------

echo ""
echo "============================================================"
echo "Release ${TAG_NAME} prepared successfully!"
echo "============================================================"
echo ""
echo "Next steps:"
echo "  1. Review the commit:  git log -1"
echo "  2. Review the tag:     git show ${TAG_NAME}"
echo "  3. Push to remote:     git push origin main --tags"
echo ""
echo "Pushing the tag will trigger the PyPI publishing workflow."
echo ""
