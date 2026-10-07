#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
gh="$PWD/.tools/gh/bin/gh.exe"
bash scripts/check.sh
mkdir -p .pages-site
if [[ ! -d .pages-site/.git ]]; then
 git -C .pages-site init -q -b gh-pages
 git -C .pages-site remote add origin https://github.com/wrightiv-dotcom/HideandSeek.git
fi
for file in index.html style.css characters.js motion.js game.js renderer.js gpu.js ambience.js; do cp "$file" .pages-site/; done
mkdir -p .pages-site/assets
cp assets/haunted-house.png .pages-site/assets/
touch .pages-site/.nojekyll
login=$("$gh" api user --jq .login)
id=$("$gh" api user --jq .id)
git -C .pages-site add index.html style.css characters.js motion.js game.js renderer.js gpu.js ambience.js assets/haunted-house.png .nojekyll
if ! git -C .pages-site diff --cached --quiet; then
 git -C .pages-site -c user.name="$login" -c user.email="${id}+${login}@users.noreply.github.com" commit -m 'Publish Hollow House game on GitHub Pages'
fi
git -C .pages-site push origin gh-pages
if "$gh" api repos/wrightiv-dotcom/HideandSeek/pages >/dev/null 2>&1; then
 "$gh" api --method PUT repos/wrightiv-dotcom/HideandSeek/pages --input scripts/pages-source.json
else
 "$gh" api --method POST repos/wrightiv-dotcom/HideandSeek/pages --input scripts/pages-source.json
fi
