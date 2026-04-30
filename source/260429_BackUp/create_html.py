import json
from pathlib import Path

ASSET_DIR = Path(__file__).parent / "assets"
TEMPLATE_PATH = ASSET_DIR / "template.html"
STYLES_PATH = ASSET_DIR / "styles.css"
SCRIPT_PATH = ASSET_DIR / "app.js"


def build_html(variables):
    data_json = json.dumps(variables, ensure_ascii=False)
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    styles = STYLES_PATH.read_text(encoding="utf-8").rstrip("\n")
    script = SCRIPT_PATH.read_text(encoding="utf-8").rstrip("\n")
    script = script.replace("__DATA_JSON__", data_json)
    return template.replace("__STYLES__", styles).replace("__SCRIPT__", script)
