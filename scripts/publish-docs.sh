#!/bin/bash
set -e # Exit with nonzero exit code if anything fails

# Credit @dtolb: https://gist.github.com/dtolb/8189c858001f5fa30556509ba69b0b8d

SOURCE_BRANCH="master"
TARGET_BRANCH="gh-pages"

function docGen {
  npm run-script generate-docs
  mv ./docs/node-bandwidth/*/* ./docs
}
NODE_VERSION=`node --version`
NODE_VERSION=${NODE_VERSION:1:1}

# Save some useful information
REPO=`git config remote.origin.url`
SSH_REPO=${REPO/https:\/\/github.com\//git@github.com:}
SHA=`git rev-parse --verify HEAD`

# Clone the existing gh-pages for this repo into docs/
# Create a new empty branch if gh-pages doesn't exist yet (should only happen on first deply)
git clone $REPO docs
cd docs
git checkout $TARGET_BRANCH || git checkout --orphan $TARGET_BRANCH
cd ..

# Clean out existing contents
rm -rf docs/**/* || exit 0

# Run our compile script
docGen

# Now let's go have some fun with the cloned repo
cd docs

# If there are no changes to the compiled out (e.g. this is a README update) then just bail.
if [ -z `git diff --exit-code` ]; then
    echo "No changes to the output on this push; exiting."
    exit 0
fi

# Commit the "changes", i.e. the new version.
# The delta will show diffs between new and old versions.
git add .
git commit -m "Deploy to GitHub Pages: ${SHA}"

# Now that we're all set up, we can push.
git push $SSH_REPO $TARGET_BRANCH