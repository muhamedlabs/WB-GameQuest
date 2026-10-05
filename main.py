import os
from flask import Flask, send_from_directory, abort, request, jsonify
from werkzeug.exceptions import HTTPException

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
    # lower(): на Windows GQ_DATA и gq_data - одна и та же папка
    parts = filename.replace("\\", "/").lower().split("/")
    if any(p.startswith(".") or p in BLOCKED_DIRS for p in parts):
        return True
    return os.path.splitext(parts[-1])[1] in BLOCKED_EXT


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


# ---------------------------------------------------------------- Страница 404
def wants_html():
    # Браузеры всегда просят text/html; боты и скрипты (requests, curl, aiohttp) - как правило, нет
    return "text/html" in request.headers.get("Accept", "")


# Краулеры превью ссылок. Discord и другие не строят превью, если страница вернула 404,
# поэтому им отдаём ту же 404.html, но со статусом 200 (в ней лежат og-теги).
PREVIEW_BOTS = ("discordbot", "twitterbot", "telegrambot", "slackbot",
                "facebookexternalhit", "whatsapp", "linkedinbot")


def is_preview_bot():
    ua = request.headers.get("User-Agent", "").lower()
    return any(b in ua for b in PREVIEW_BOTS)


def render_404():
    path = os.path.join(BASE_DIR, "404.html")
    if os.path.isfile(path):
        resp = send_from_directory(BASE_DIR, "404.html")
    else:
        # запасной вариант, если 404.html вдруг удалили
        resp = app.response_class("404 Not Found", mimetype="text/plain")
    # Обычным пользователям и ботам API - честный 404, краулерам превью - 200
    resp.status_code = 200 if is_preview_bot() else 404
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.errorhandler(HTTPException)
def handle_http_error(e):
    # Краулер превью (Discord и т.п.) всегда получает страницу с og-тегами
    if is_preview_bot():
        return render_404()
    # Бот на /api/... получает JSON, все остальные (браузер) - страницу 404
    if request.path.startswith("/api/") and not wants_html():
        return jsonify({"error": e.name.lower().replace(" ", "_")}), e.code
    return render_404()


def run_flask():
    print("[FLASK] Starting Flask server on port 6001")
    print(f"[FLASK] Serving files from: {BASE_DIR}")
    print(f"[FLASK] Game stats DB: {os.path.join(DATA_DIR, 'leaderboard.db')}")
    # debug=True на 0.0.0.0 опасен (отладчик Werkzeug умеет выполнять код) — включай только локально: FLASK_DEBUG=1
    app.run(host="0.0.0.0", port=6001, debug=os.environ.get("FLASK_DEBUG") == "1")


if __name__ == "__main__":
    print("[APP] Starting application...")
    run_flask()