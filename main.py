import os
from flask import Flask, send_from_directory, abort

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, template_folder=BASE_DIR, static_folder=BASE_DIR)

@app.route("/")
def home():
    """Главная страница - home.html"""
    return send_from_directory(BASE_DIR, "home.html")

@app.route("/<path:filename>")
def serve_file(filename):
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
    app.run(host="0.0.0.0", port=6001, debug=True)

if __name__ == "__main__":
    print("[APP] Starting application...")
    run_flask()