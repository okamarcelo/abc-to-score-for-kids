#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

python3 - <<'PYEOF' "$SCRIPT_DIR"
import sys
import os

root = sys.argv[1]

html_path = os.path.join(root, "index.html")
css_path  = os.path.join(root, "src", "style.css")
js_path   = os.path.join(root, "src", "app.js")
dist_path = os.path.join(root, "dist", "score.html")
docs_path = os.path.join(root, "docs", "index.html")

with open(html_path, "r", encoding="utf-8") as f:
    html = f.read()

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

with open(js_path, "r", encoding="utf-8") as f:
    js_raw = f.read()

# Remove the Node.js / Jest export block from the end of app.js
marker = "/* Allow Jest to import pure functions without a DOM */"
idx = js_raw.find(marker)
if idx != -1:
    js = js_raw[:idx].rstrip()
else:
    js = js_raw.rstrip()

# Replace CSS link tag with inline <style>
css_tag  = '<link rel="stylesheet" href="src/style.css" />'
css_inline = f"<style>\n{css}\n</style>"
html = html.replace(css_tag, css_inline)

# Replace JS script tag with inline <script>
js_tag    = '<script src="src/app.js"></script>'
js_inline = f"<script>\n{js}\n</script>"
html = html.replace(js_tag, js_inline)

os.makedirs(os.path.dirname(dist_path), exist_ok=True)
os.makedirs(os.path.dirname(docs_path), exist_ok=True)

with open(dist_path, "w", encoding="utf-8") as f:
    f.write(html)

with open(docs_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Build concluído com sucesso!")
print(f"  -> {dist_path}")
print(f"  -> {docs_path}")
PYEOF
