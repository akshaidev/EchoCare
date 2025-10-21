# app.py
import os
import sqlite3
import datetime
import secrets
from flask import Flask, request, jsonify, render_template, g, redirect
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = "database.db"
app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['JSON_SORT_KEYS'] = False


# ========== DATABASE HELPERS ==========
def get_db():
    db = getattr(g, "_database", None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH, check_same_thread=False)
        db.row_factory = sqlite3.Row
    return db

def execute_db(query, args=()):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(query, args)
    conn.commit()
    return cur.lastrowid

def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, "_database", None)
    if db is not None:
        db.close()

# ========== INITIALIZE DB ==========
def init_db():
    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''CREATE TABLE users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        token TEXT,
                        created_at TEXT NOT NULL
                    )''')
        conn.commit()
        conn.close()
        print("✅ Database initialized.")
    else:
        print("ℹ️  Database found; skipping creation.")


# ========== AUTH HELPERS ==========
def generate_token():
    return secrets.token_hex(24)

def require_token(f):
    def wrapper(*args, **kwargs):
        token = None
        if "Authorization" in request.headers:
            token = request.headers.get("Authorization").replace("Bearer ", "")
        elif request.is_json:
            token = request.json.get("token")
        if not token:
            return jsonify({"error": "auth_required"}), 401
        user = query_db("SELECT * FROM users WHERE token = ?", (token,), one=True)
        if not user:
            return jsonify({"error": "invalid_token"}), 401
        request.user = user
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper


# ========== ROUTES ==========
@app.route("/")
def root():
    return redirect("/login")

@app.route("/login")
def login_page():
    return render_template("login.html")

@app.route("/chat")
def chat_page():
    return render_template("chat.html")


# ========== AUTH ENDPOINTS ==========
@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username_and_password_required"}), 400

    existing = query_db("SELECT * FROM users WHERE username = ?", (username,), one=True)
    if existing:
        return jsonify({"error": "username_taken"}), 400

    pw_hash = generate_password_hash(password)
    token = generate_token()
    created_at = datetime.datetime.utcnow().isoformat()
    user_id = execute_db("INSERT INTO users (username, password_hash, token, created_at) VALUES (?, ?, ?, ?)",
                         (username, pw_hash, token, created_at))
    return jsonify({"message": "registered", "token": token, "user_id": user_id})

@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.json or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"error": "username_and_password_required"}), 400

    user = query_db("SELECT * FROM users WHERE username = ?", (username,), one=True)
    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "invalid_credentials"}), 401

    token = generate_token()
    execute_db("UPDATE users SET token = ? WHERE id = ?", (token, user["id"]))
    return jsonify({"message": "logged_in", "token": token, "user_id": user["id"]})

@app.route("/api/logout", methods=["POST"])
@require_token
def api_logout():
    user = request.user
    execute_db("UPDATE users SET token = NULL WHERE id = ?", (user["id"],))
    return jsonify({"message": "logged_out"})


# ========== START ==========
if __name__ == "__main__":
    @app.after_request
    def add_header(r):
        r.headers["Cache-Control"] = "no-store"
        return r

    init_db()
    print("🚀 EchoCare server running at http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
