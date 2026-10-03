"""Хранилище статистики игры (SQLite, только стандартная библиотека)."""
import re
import sqlite3
import threading
import time

MAX_SCORE = 100_000   # потолок очков за один забег
MAX_RATE = 30         # очков в секунду с запасом (в игре реально ~9–20)
MIN_GAP = 2.0         # не чаще одного результата в 2 с от одного игрока

_ID_RE = re.compile(r"^[\w-]{8,64}$")
_NAME_RE = re.compile(r"[\x00-\x1f<>]")

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    best       INTEGER NOT NULL DEFAULT 0,
    games      INTEGER NOT NULL DEFAULT 0,
    total      INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_players_best ON players (best DESC);
"""

UPSERT = """
INSERT INTO players (id, name, best, games, total, created_at, updated_at)
VALUES (?, ?, ?, 1, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET
    name       = excluded.name,
    best       = MAX(players.best, excluded.best),
    games      = players.games + 1,
    total      = players.total + excluded.total,
    updated_at = excluded.updated_at
"""


def clean_name(value) -> str:
    return _NAME_RE.sub("", str(value or "")).strip()[:20]


class Storage:
    def __init__(self, path: str = "leaderboard.db"):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        # NOCASE в SQLite не понимает кириллицу, поэтому регистр сравниваем в Python
        self.db.create_function("pylower", 1, lambda v: v.casefold() if isinstance(v, str) else v)
        self.db.executescript(SCHEMA)
        self._last: dict[str, float] = {}
        self._lock = threading.Lock()  # Flask/aiohttp могут звать из разных потоков

    def submit(self, data) -> tuple[int, dict]:
        """Принимает результат забега. Возвращает (HTTP-статус, ответ)."""
        if not isinstance(data, dict):
            return 400, {"error": "bad_request"}
        pid = str(data.get("playerId") or "")
        name = clean_name(data.get("name"))
        score, dur = data.get("score"), data.get("duration")

        if (not _ID_RE.match(pid) or not name or isinstance(score, bool)
                or not isinstance(score, int) or not 1 <= score <= MAX_SCORE):
            return 400, {"error": "bad_request"}
        if (isinstance(dur, bool) or not isinstance(dur, (int, float))
                or dur < 1 or score > dur * MAX_RATE + 50):
            return 422, {"error": "suspicious"}

        now = time.time()
        with self._lock:
            if now - self._last.get(pid, 0) < MIN_GAP:
                return 429, {"error": "too_fast"}
            self._last[pid] = now
            if len(self._last) > 10_000:  # чистим старые записи
                self._last = {k: v for k, v in self._last.items() if now - v < 60}
            ms = int(now * 1000)
            self.db.execute(UPSERT, (pid, name, score, score, ms, ms))
            self.db.commit()
        return 200, {"ok": True}

    def top(self, limit: int = 10) -> list[dict]:
        with self._lock:
            rows = self.db.execute(
                "SELECT name, best, games, total FROM players "
                "ORDER BY best DESC, updated_at ASC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def find(self, nick: str):
        """Игрок по нику (без учёта регистра) + его место в топе."""
        with self._lock:
            row = self.db.execute(
                "SELECT name, best, games, total FROM players WHERE pylower(name) = ? "
                "ORDER BY best DESC LIMIT 1", (nick.casefold(),)).fetchone()
            if not row:
                return None
            place = self.db.execute(
                "SELECT COUNT(*) + 1 FROM players WHERE best > ?", (row["best"],)).fetchone()[0]
        return {**dict(row), "place": place}
