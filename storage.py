"""Хранилище статистики игры (SQLite)."""
import hashlib
import hmac
import re
import secrets
import sqlite3
import threading
import time

MAX_SCORE = 100_000
MAX_RATE = 30
MIN_GAP = 2.0

MAX_FAILS = 5
LOCK_SECONDS = 900

_NAME_RE = re.compile(r"[\x00-\x1f<>]")
_CODE_RE = re.compile(r"\d{4}")

SCHEMA = """
CREATE TABLE IF NOT EXISTS players (
    name_key   TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    best       INTEGER NOT NULL DEFAULT 0,
    games      INTEGER NOT NULL DEFAULT 0,
    total      INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    token_hash TEXT
);
CREATE INDEX IF NOT EXISTS idx_players_best ON players (best DESC);
"""

UPSERT = """
INSERT INTO players (name_key, name, best, games, total, created_at, updated_at)
VALUES (?, ?, ?, 1, ?, ?, ?)
ON CONFLICT(name_key) DO UPDATE SET
    best       = MAX(players.best, excluded.best),
    games      = players.games + 1,
    total      = players.total + excluded.total,
    updated_at = excluded.updated_at
"""


def clean_name(value) -> str:
    return _NAME_RE.sub("", str(value or "")).strip()[:20]


def _hash(key: str, code: str) -> str:
    return hashlib.sha256(f"{key}:{code}".encode()).hexdigest()


def _new_code() -> str:
    return f"{secrets.randbelow(10000):04d}"


class Storage:
    def __init__(self, path: str = "leaderboard.db"):
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA wal_autocheckpoint=100")
        self._migrate_old()
        self.db.executescript(SCHEMA)
        cols = {r[1] for r in self.db.execute("PRAGMA table_info(players)")}
        if "token_hash" not in cols:
            self.db.execute("ALTER TABLE players ADD COLUMN token_hash TEXT")
            self.db.commit()
        self._last: dict[str, float] = {}
        self._fails: dict[str, list] = {}
        self._lock = threading.Lock()

    def _migrate_old(self):
        cols = {r[1] for r in self.db.execute("PRAGMA table_info(players)")}
        if "id" not in cols:
            return
        rows = self.db.execute(
            "SELECT name, best, games, total, created_at, updated_at FROM players "
            "ORDER BY best DESC, updated_at ASC").fetchall()
        self.db.execute("DROP INDEX IF EXISTS idx_players_best")
        self.db.execute("DROP INDEX IF EXISTS idx_players_name_key")
        self.db.execute("DROP INDEX IF EXISTS idx_players_key")
        self.db.execute("ALTER TABLE players RENAME TO players_old")
        self.db.executescript(SCHEMA)
        taken = set()
        for r in rows:
            name, key, n = r["name"], r["name"].casefold(), 1
            while key in taken:
                n += 1
                suffix = f"_{n}"
                name = r["name"][:20 - len(suffix)] + suffix
                key = name.casefold()
            taken.add(key)
            self.db.execute(
                "INSERT INTO players (name_key, name, best, games, total, created_at, updated_at) "
                "VALUES (?,?,?,?,?,?,?)",
                (key, name, r["best"], r["games"], r["total"], r["created_at"], r["updated_at"]))
        self.db.execute("DROP TABLE players_old")
        self.db.commit()


    def _auth(self, key: str, code) -> str:
        """'ok' | 'bad' | 'locked'. Только под self._lock."""
        now = time.time()
        f = self._fails.get(key)
        if f and f[1] > now:
            return "locked"
        if f and now - f[2] > LOCK_SECONDS:
            self._fails.pop(key, None)
            f = None
        code = str(code).strip() if code is not None else ""
        if not _CODE_RE.fullmatch(code):
            return "bad"
        row = self.db.execute(
            "SELECT token_hash FROM players WHERE name_key = ?", (key,)).fetchone()
        if row and row["token_hash"] and hmac.compare_digest(row["token_hash"], _hash(key, code)):
            self._fails.pop(key, None)
            return "ok"
        if not f:
            f = self._fails[key] = [0, 0.0, now]
        f[0] += 1
        if f[0] >= MAX_FAILS:
            f[0], f[1], f[2] = 0, now + LOCK_SECONDS, now
        if len(self._fails) > 10_000:
            self._fails = {k: v for k, v in self._fails.items() if now - v[2] < LOCK_SECONDS * 2}
        return "bad"


    def register(self, data) -> tuple[int, dict]:
        if not isinstance(data, dict):
            return 400, {"error": "bad_request"}
        name = clean_name(data.get("name"))
        if not name:
            return 400, {"error": "bad_request"}
        ms = int(time.time() * 1000)
        key = name.casefold()
        code = _new_code()
        with self._lock:
            try:
                self.db.execute(
                    "INSERT INTO players (name_key, name, best, games, total, created_at, updated_at, token_hash) "
                    "VALUES (?, ?, 0, 0, 0, ?, ?, ?)", (key, name, ms, ms, _hash(key, code)))
            except sqlite3.IntegrityError:
                # старый ник без кода: первый забравший становится владельцем
                cur = self.db.execute(
                    "UPDATE players SET token_hash = ? WHERE name_key = ? AND token_hash IS NULL",
                    (_hash(key, code), key))
                if cur.rowcount == 0:
                    self.db.rollback()
                    return 409, {"error": "name_taken"}
            self.db.commit()
        return 200, {"ok": True, "token": code,
                     "player": {"name": name, "best": 0, "games": 0, "total": 0}}

    def login(self, data) -> tuple[int, dict]:
        if not isinstance(data, dict):
            return 400, {"error": "bad_request"}
        nick = clean_name(data.get("name"))
        if not nick:
            return 400, {"error": "bad_request"}
        key = nick.casefold()
        with self._lock:
            res = self._auth(key, data.get("token"))
            if res == "locked":
                return 429, {"error": "locked"}
            if res != "ok":
                return 403, {"error": "bad_token"}
            row = self.db.execute(
                "SELECT name, best, games, total FROM players WHERE name_key = ?", (key,)).fetchone()
        return 200, {"ok": True, "player": dict(row)}


    def submit(self, data) -> tuple[int, dict]:
        if not isinstance(data, dict):
            return 400, {"error": "bad_request"}
        name = clean_name(data.get("name"))
        score, dur = data.get("score"), data.get("duration")

        if (not name or isinstance(score, bool)
                or not isinstance(score, int) or not 1 <= score <= MAX_SCORE):
            return 400, {"error": "bad_request"}
        if (isinstance(dur, bool) or not isinstance(dur, (int, float))
                or dur < 1 or score > dur * MAX_RATE + 50):
            return 422, {"error": "suspicious"}

        key = name.casefold()
        now = time.time()
        with self._lock:
            res = self._auth(key, data.get("token"))
            if res == "locked":
                return 429, {"error": "locked"}
            if res != "ok":
                return 403, {"error": "bad_token"}
            if now - self._last.get(key, 0) < MIN_GAP:
                return 429, {"error": "too_fast"}
            self._last[key] = now
            if len(self._last) > 10_000:
                self._last = {k: v for k, v in self._last.items() if now - v < 60}
            ms = int(now * 1000)
            self.db.execute(UPSERT, (key, name, score, score, ms, ms))
            self.db.commit()
            self.db.execute("PRAGMA wal_checkpoint(PASSIVE)")
        return 200, {"ok": True}


    def top(self, limit: int = 10) -> list[dict]:
        with self._lock:
            rows = self.db.execute(
                "SELECT name, best, games, total FROM players WHERE games > 0 "
                "ORDER BY best DESC, updated_at ASC LIMIT ?", (limit,)).fetchall()
        return [dict(r) for r in rows]

    def find(self, nick: str):
        with self._lock:
            row = self.db.execute(
                "SELECT name, best, games, total FROM players WHERE name_key = ?",
                (clean_name(nick).casefold(),)).fetchone()
            if not row:
                return None
            place = self.db.execute(
                "SELECT COUNT(*) + 1 FROM players WHERE best > ?", (row["best"],)).fetchone()[0]
        return {**dict(row), "place": place}

    def restore(self, data) -> tuple[int, dict]:
        if not isinstance(data, dict):
            return 400, {"error": "bad_request"}
        nick = clean_name(data.get("name"))
        if not nick:
            return 400, {"error": "bad_request"}
        with self._lock:
            row = self.db.execute(
                "SELECT name, best, games, total FROM players WHERE name_key = ?",
                (nick.casefold(),)).fetchone()
        if not row:
            return 404, {"error": "not_found"}
        return 200, {"ok": True, "player": dict(row)}
