"""Local SQLite persistence. Credentials never belong here."""
import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.environ.get('TUTOR_DB_PATH', Path.home() / '.dsh-tutorloop' / 'data' / 'tutor.sqlite3'))


def dumps(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False)


@contextmanager
def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH, timeout=15)
    con.row_factory = sqlite3.Row
    con.execute('PRAGMA foreign_keys=ON')
    con.executescript('''
        CREATE TABLE IF NOT EXISTS chunks (
            id TEXT PRIMARY KEY, title TEXT NOT NULL, locator TEXT NOT NULL,
            url TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL,
            added_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS chunk_metadata (id TEXT PRIMARY KEY, metadata TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT NOT NULL,
            question TEXT NOT NULL, answer TEXT NOT NULL, result TEXT NOT NULL,
            score REAL NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS exercises (
            id TEXT PRIMARY KEY, seed_id TEXT NOT NULL, topic TEXT NOT NULL,
            question TEXT NOT NULL, sources TEXT NOT NULL, mode TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 0, hints_used INTEGER NOT NULL DEFAULT 0,
            answer_shown INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS tutor_attempts (
            id TEXT PRIMARY KEY, exercise_id TEXT NOT NULL REFERENCES exercises(id),
            submission_id TEXT NOT NULL UNIQUE, answer TEXT NOT NULL,
            status TEXT NOT NULL, feedback TEXT, elapsed_seconds REAL NOT NULL,
            assisted INTEGER NOT NULL, revision INTEGER NOT NULL, created_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS reviews (
            seed_id TEXT PRIMARY KEY, skill TEXT NOT NULL, due_at TEXT NOT NULL,
            successes INTEGER NOT NULL DEFAULT 0, last_attempt_id TEXT NOT NULL,
            next_step TEXT NOT NULL);
    ''')
    if 'profile' not in {r['name'] for r in con.execute('PRAGMA table_info(exercises)')}:
        try:
            con.execute("ALTER TABLE exercises ADD COLUMN profile TEXT NOT NULL DEFAULT '{}'")
        except sqlite3.OperationalError:
            if 'profile' not in {r['name'] for r in con.execute('PRAGMA table_info(exercises)')}:
                con.close()
                raise
    con.commit()
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def set_value(key, value, con=None):
    if con is not None:
        con.execute('INSERT OR REPLACE INTO settings VALUES (?,?)', (key, dumps(value)))
        return
    with connect() as connection:
        set_value(key, value, connection)


def get_value(key, default=None):
    with connect() as con:
        row = con.execute('SELECT value FROM settings WHERE key=?', (key,)).fetchone()
    return json.loads(row[0]) if row else default


def add_chunks(chunks):
    count = 0
    with connect() as con:
        for chunk in chunks:
            item = {k: str(chunk.get(k) or '') for k in ('id', 'title', 'locator', 'url', 'kind', 'text')}
            if not item['id'] or not item['text'].strip():
                continue
            cur = con.execute('INSERT OR IGNORE INTO chunks (id,title,locator,url,kind,text) VALUES (:id,:title,:locator,:url,:kind,:text)', item)
            count += cur.rowcount
            metadata = {k: v for k, v in chunk.items() if k not in item}
            con.execute('INSERT OR REPLACE INTO chunk_metadata VALUES (?,?)', (item['id'], dumps(metadata)))
    return count


def get_chunks(limit=None):
    with connect() as con:
        query = 'SELECT c.*,m.metadata FROM chunks c LEFT JOIN chunk_metadata m ON c.id=m.id ORDER BY c.added_at DESC'
        rows = con.execute(query + (' LIMIT ?' if limit is not None else ''), (limit,) if limit is not None else ()).fetchall()
    result = []
    for row in rows:
        data = dict(row)
        data.update(json.loads(data.pop('metadata') or '{}'))
        result.append(data)
    return result


def count_chunks():
    with connect() as con:
        return con.execute('SELECT COUNT(*) FROM chunks').fetchone()[0]


def save_attempt(topic, question, answer, result, score):
    """Compatibility for starter callers; new workflow uses tutor_attempts."""
    with connect() as con:
        con.execute('INSERT INTO attempts(topic,question,answer,result,score) VALUES(?,?,?,?,?)',
                    (topic, dumps(question), answer, dumps(result), score))


def get_attempts(limit=50):
    with connect() as con:
        rows = con.execute('''SELECT a.*,e.topic,e.question,e.seed_id,e.profile FROM tutor_attempts a
            JOIN exercises e ON a.exercise_id=e.id ORDER BY a.created_at DESC LIMIT ?''', (limit,)).fetchall()
        legacy = con.execute('SELECT * FROM attempts ORDER BY id DESC LIMIT ?', (limit,)).fetchall()
    result = []
    for row in rows:
        item = dict(row)
        item['question'] = json.loads(item['question'])
        item['learning_profile'] = json.loads(item.pop('profile') or '{}')
        item['result'] = json.loads(item.pop('feedback') or '{}')
        item['score'] = item['result'].get('score')
        result.append(item)
    for row in legacy:
        item = dict(row)
        item.update(question=json.loads(item['question']), result=json.loads(item['result']), status='graded')
        result.append(item)
    return sorted(result, key=lambda item: item['created_at'], reverse=True)[:limit]


def recent_weakness(profile_id=None):
    return '；'.join(dict.fromkeys(a['result']['next_skill'] for a in get_attempts(5)
                                 if a['result'].get('next_skill') and isinstance(a.get('score'), (int, float)) and a['score'] < 10
                                 and (profile_id is None or a.get('learning_profile', {}).get('id', 'gongkao') == profile_id)))
