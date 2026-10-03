import os
from flask import Flask, send_from_directory, abort, request, jsonify

from storage import Storage

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DATA_DIR = os.environ.get("GQ_DATA_DIR", os.path.join(BASE_DIR, "assets", "gq_data"))
os.makedirs(DATA_DIR, exist_ok=True)
storage = Storage(os.path.join(DATA_DIR, "leaderboard.db"))

# static_folder=None: отключаем встроенный /static, он отдавал файлы мимо is_blocked
app = Flask(__name__, template_folder=BASE_DIR, static_folder=None)

# Эти файлы никогда не отдаём по ссылке (код, базы, секреты, логи)
BLOCKED_EXT = {".py", ".pyc", ".db", ".sqlite", ".sqlite3", ".env", ".log", ".ini", ".cfg", ".toml", ".yml", ".yaml"}
BLOCKED_DIRS = {"__pycache__", "venv", ".venv", "node_modules", "gq_data"}


def is_blocked(filename):
    parts = filename.replace("\\", "/").split("/")
    if any(p.startswith(".") or p in BLOCKED_DIRS for p in parts):
        return True
    return os.path.splitext(parts[-1])[1].lower() in BLOCKED_EXT


# ---------------------------------------------------------------- API статистики игры
@app.post("/api/score")
def api_score():
    status, body = storage.submit(request.get_json(silent=True))
    return jsonify(body), status


@app.get("/api/leaderboard")
def api_leaderboard():
    try:
        limit = min(50, max(1, int(request.args.get("limit", 10))))
    except ValueError:
        limit = 10
    resp = jsonify({"players": storage.top(limit)})
    resp.headers["Cache-Control"] = "public, max-age=10"
    return resp


@app.get("/api/player")
def api_player():
    nick = request.args.get("nick", "").strip()
    player = storage.find(nick) if nick else None
    if not player:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"player": player})


# ---------------------------------------------------------------- Сайт
@app.route("/")
def home():
    """Главная страница - home.html"""
    return send_from_directory(BASE_DIR, "home.html")

@app.route("/<path:filename>")
def serve_file(filename):
    if is_blocked(filename):
        return abort(404)

    # Пробуем точное имя
    filepath = os.path.join(BASE_DIR, filename)
    if os.path.isfile(filepath):
        return send_from_directory(BASE_DIR, filename)

    # Пробуем с .html на конце
    html_filepath = filepath + ".html"
    if os.path.isfile(html_filepath):
        return send_from_directory(BASE_DIR, filename + ".html")

    return abort(404)

def run_flask():
    print("[FLASK] Starting Flask server on port 6001")
    print(f"[FLASK] Serving files from: {BASE_DIR}")
    print(f"[FLASK] Game stats DB: {os.path.join(DATA_DIR, 'leaderboard.db')}")
    # debug=True на 0.0.0.0 опасен (отладчик Werkzeug умеет выполнять код) — включай только локально: FLASK_DEBUG=1
    app.run(host="0.0.0.0", port=6001, debug=os.environ.get("FLASK_DEBUG") == "1")

if __name__ == "__main__":
    print("[APP] Starting application...")
    run_flask()