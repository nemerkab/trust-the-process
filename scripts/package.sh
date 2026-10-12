#!/usr/bin/env bash
# Build a zip ready to upload to the Chrome Web Store.
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(python3 -c 'import json; print(json.load(open("manifest.json"))["version"])')
mkdir -p dist
out="dist/trust-the-process-${version}.zip"
rm -f "$out"
zip -r -X "$out" manifest.json src icons LICENSE -x '*.DS_Store'
echo "Built $out"
