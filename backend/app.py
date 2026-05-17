import os
import json
import random
import string
import sqlite3
import datetime

from flask import Flask, jsonify, request, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), "freeup.db")

# Each "time of day" segment maps to representative hour rows in the grid.
TIME_HOURS = {
    "morning": [9, 11],
    "afternoon": [13, 15],
    "evening": [17, 19],
    "night": [21, 23],
}
TIME_ORDER = ["morning", "afternoon", "evening", "night"]
STATES = ("yeah", "maybe", "nah")


# --------------------------------------------------------------------------
# database
# --------------------------------------------------------------------------
def get_db():
    db = getattr(g, "_db", None)
    if db is None:
        db = g._db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_db(_exc):
    db = getattr(g, "_db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS plans (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            type        TEXT,
            date_start  TEXT,
            date_end    TEXT,
            time_of_day TEXT,
            days        TEXT,
            hours       TEXT,
            organiser   TEXT,
            invited     TEXT DEFAULT '[]',
            items       TEXT DEFAULT '[]',
            locked_slot TEXT,
            location    TEXT,
            notes       TEXT,
            nudge_count INTEGER DEFAULT 0,
            created_at  TEXT
        );
        CREATE TABLE IF NOT EXISTS responses (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            plan_id      TEXT NOT NULL,
            name         TEXT NOT NULL,
            availability TEXT DEFAULT '{}',
            is_organiser INTEGER DEFAULT 0,
            headcount    TEXT DEFAULT 'coming',
            created_at   TEXT
        );
        """
    )
    db.commit()
    db.close()


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------
def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def gen_id(db):
    alphabet = string.ascii_lowercase + string.digits
    while True:
        pid = "".join(random.choices(alphabet, k=6))
        if not db.execute("SELECT 1 FROM plans WHERE id = ?", (pid,)).fetchone():
            return pid


def hour_label(h):
    suffix = "am" if h < 12 else "pm"
    hh = h % 12 or 12
    return f"{hh}{suffix}"


def build_days(start, end):
    try:
        s = datetime.date.fromisoformat(start)
        e = datetime.date.fromisoformat(end)
    except (TypeError, ValueError):
        s = datetime.date.today()
        e = s + datetime.timedelta(days=6)
    if e < s:
        e = s
    days, d = [], s
    while d <= e and len(days) < 14:
        days.append(
            {
                "date": d.isoformat(),
                "label": d.strftime("%a"),
                "sub": f"{d.day} {d.strftime('%b')}",
            }
        )
        d += datetime.timedelta(days=1)
    return days


def build_hours(time_of_day):
    hours = []
    for seg in TIME_ORDER:
        if seg in time_of_day:
            for h in TIME_HOURS[seg]:
                hours.append({"hour": h, "label": hour_label(h), "seg": seg})
    if not hours:
        hours = [
            {"hour": h, "label": hour_label(h), "seg": "evening"}
            for h in TIME_HOURS["evening"]
        ]
    return hours


def slot_key(date, hour):
    return f"{date}@{hour}"


def compute_results(days, hours, responses):
    """Tally every grid cell and surface the single best window."""
    slots = {}
    for day in days:
        for hour in hours:
            slots[slot_key(day["date"], hour["hour"])] = {
                "yeah": 0,
                "maybe": 0,
                "nah": 0,
            }

    for resp in responses:
        avail = resp["availability"]
        for key, val in avail.items():
            if key in slots and val in STATES:
                slots[key][val] += 1

    total = len(responses)
    best = None
    for day in days:
        for hour in hours:
            key = slot_key(day["date"], hour["hour"])
            counts = slots[key]
            score = counts["yeah"] * 2 + counts["maybe"]
            available = counts["yeah"] + counts["maybe"]
            candidate = {
                "key": key,
                "date": day["date"],
                "dayLabel": day["label"],
                "daySub": day["sub"],
                "hour": hour["hour"],
                "hourLabel": hour["label"],
                "score": score,
                "available": available,
                "yeah": counts["yeah"],
            }
            if best is None or (score, counts["yeah"]) > (
                best["score"],
                best["yeah"],
            ):
                best = candidate

    if best is not None and best["score"] == 0:
        best = None
    return {"slots": slots, "total": total, "best": best}


def serialize_plan(db, pid):
    row = db.execute("SELECT * FROM plans WHERE id = ?", (pid,)).fetchone()
    if row is None:
        return None

    resp_rows = db.execute(
        "SELECT * FROM responses WHERE plan_id = ? ORDER BY id", (pid,)
    ).fetchall()

    days = json.loads(row["days"])
    hours = json.loads(row["hours"])
    responses = [
        {
            "name": r["name"],
            "availability": json.loads(r["availability"] or "{}"),
            "isOrganiser": bool(r["is_organiser"]),
            "headcount": r["headcount"],
        }
        for r in resp_rows
    ]
    responder_names = {r["name"].strip().lower() for r in responses}
    invited = json.loads(row["invited"] or "[]")
    invited_view = [
        {"name": n, "responded": n.strip().lower() in responder_names}
        for n in invited
    ]

    return {
        "id": row["id"],
        "name": row["name"],
        "type": row["type"],
        "dateStart": row["date_start"],
        "dateEnd": row["date_end"],
        "timeOfDay": json.loads(row["time_of_day"] or "[]"),
        "days": days,
        "hours": hours,
        "organiser": row["organiser"],
        "invited": invited_view,
        "items": json.loads(row["items"] or "[]"),
        "lockedSlot": row["locked_slot"],
        "location": row["location"],
        "notes": row["notes"],
        "nudgeCount": row["nudge_count"],
        "createdAt": row["created_at"],
        "responses": responses,
        "results": compute_results(days, hours, responses),
    }


def upsert_response(db, pid, name, availability, is_organiser=False,
                    headcount=None):
    existing = db.execute(
        "SELECT id FROM responses WHERE plan_id = ? AND lower(trim(name)) = ?",
        (pid, name.strip().lower()),
    ).fetchone()
    if existing:
        fields, values = [], []
        if availability is not None:
            fields.append("availability = ?")
            values.append(json.dumps(availability))
        if headcount is not None:
            fields.append("headcount = ?")
            values.append(headcount)
        if fields:
            values.append(existing["id"])
            db.execute(
                f"UPDATE responses SET {', '.join(fields)} WHERE id = ?", values
            )
    else:
        db.execute(
            "INSERT INTO responses (plan_id, name, availability, is_organiser, "
            "headcount, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (
                pid,
                name.strip(),
                json.dumps(availability or {}),
                1 if is_organiser else 0,
                headcount or "coming",
                now_iso(),
            ),
        )


# --------------------------------------------------------------------------
# routes
# --------------------------------------------------------------------------
@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/stats")
def stats():
    db = get_db()
    plans = db.execute("SELECT COUNT(*) c FROM plans").fetchone()["c"]
    return jsonify({"plansMade": plans})


@app.route("/api/plans", methods=["POST"])
def create_plan():
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Plan needs a name"}), 400

    db = get_db()
    pid = gen_id(db)
    days = build_days(data.get("dateStart"), data.get("dateEnd"))
    hours = build_hours(data.get("timeOfDay") or [])
    organiser = (data.get("organiser") or "Organiser").strip()

    db.execute(
        "INSERT INTO plans (id, name, type, date_start, date_end, time_of_day, "
        "days, hours, organiser, invited, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            pid,
            name,
            data.get("type") or "other",
            data.get("dateStart"),
            data.get("dateEnd"),
            json.dumps(data.get("timeOfDay") or []),
            json.dumps(days),
            json.dumps(hours),
            organiser,
            json.dumps([organiser]),
            now_iso(),
        ),
    )
    upsert_response(
        db, pid, organiser, data.get("availability") or {}, is_organiser=True
    )
    db.commit()
    return jsonify(serialize_plan(db, pid)), 201


@app.route("/api/plans/<pid>")
def get_plan(pid):
    plan = serialize_plan(get_db(), pid)
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    return jsonify(plan)


@app.route("/api/plans/<pid>/responses", methods=["POST"])
def add_response(pid):
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "We need your name"}), 400

    db = get_db()
    plan = db.execute("SELECT id, invited FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404

    upsert_response(db, pid, name, data.get("availability") or {})

    invited = json.loads(plan["invited"] or "[]")
    if not any(i.strip().lower() == name.lower() for i in invited):
        invited.append(name)
        db.execute(
            "UPDATE plans SET invited = ? WHERE id = ?", (json.dumps(invited), pid)
        )
    db.commit()
    return jsonify(serialize_plan(db, pid)), 201


@app.route("/api/plans/<pid>/invite", methods=["POST"])
def add_invite(pid):
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    db = get_db()
    plan = db.execute("SELECT invited FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    invited = json.loads(plan["invited"] or "[]")
    if name and not any(i.strip().lower() == name.lower() for i in invited):
        invited.append(name)
        db.execute(
            "UPDATE plans SET invited = ? WHERE id = ?", (json.dumps(invited), pid)
        )
        db.commit()
    return jsonify(serialize_plan(db, pid))


@app.route("/api/plans/<pid>/nudge", methods=["POST"])
def nudge(pid):
    db = get_db()
    plan = db.execute("SELECT id FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    db.execute(
        "UPDATE plans SET nudge_count = nudge_count + 1 WHERE id = ?", (pid,)
    )
    db.commit()
    return jsonify(serialize_plan(db, pid))


@app.route("/api/plans/<pid>/lock", methods=["POST"])
def lock_plan(pid):
    data = request.get_json(force=True) or {}
    db = get_db()
    plan = db.execute("SELECT id FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    db.execute(
        "UPDATE plans SET locked_slot = ?, location = ?, notes = ? WHERE id = ?",
        (
            data.get("slot"),
            (data.get("location") or "").strip() or None,
            (data.get("notes") or "").strip() or None,
            pid,
        ),
    )
    db.commit()
    return jsonify(serialize_plan(db, pid))


@app.route("/api/plans/<pid>/unlock", methods=["POST"])
def unlock_plan(pid):
    db = get_db()
    plan = db.execute("SELECT id FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    db.execute("UPDATE plans SET locked_slot = NULL WHERE id = ?", (pid,))
    db.commit()
    return jsonify(serialize_plan(db, pid))


@app.route("/api/plans/<pid>/headcount", methods=["POST"])
def set_headcount(pid):
    data = request.get_json(force=True) or {}
    name = (data.get("name") or "").strip()
    status = data.get("status")
    if status not in ("coming", "maybe", "cant"):
        return jsonify({"error": "Bad status"}), 400
    db = get_db()
    plan = db.execute("SELECT id FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    if not name:
        return jsonify({"error": "We need your name"}), 400
    upsert_response(db, pid, name, None, headcount=status)
    db.commit()
    return jsonify(serialize_plan(db, pid))


@app.route("/api/plans/<pid>/items", methods=["POST"])
def add_item(pid):
    data = request.get_json(force=True) or {}
    label = (data.get("item") or "").strip()
    by = (data.get("by") or "").strip()
    if not label:
        return jsonify({"error": "Item needs a name"}), 400
    db = get_db()
    plan = db.execute("SELECT items FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    items = json.loads(plan["items"] or "[]")
    items.append(
        {"id": "".join(random.choices(string.ascii_lowercase, k=6)),
         "item": label, "by": by}
    )
    db.execute("UPDATE plans SET items = ? WHERE id = ?", (json.dumps(items), pid))
    db.commit()
    return jsonify(serialize_plan(db, pid))


@app.route("/api/plans/<pid>/items/<item_id>", methods=["DELETE"])
def delete_item(pid, item_id):
    db = get_db()
    plan = db.execute("SELECT items FROM plans WHERE id = ?", (pid,)).fetchone()
    if plan is None:
        return jsonify({"error": "Plan not found"}), 404
    items = [i for i in json.loads(plan["items"] or "[]") if i.get("id") != item_id]
    db.execute("UPDATE plans SET items = ? WHERE id = ?", (json.dumps(items), pid))
    db.commit()
    return jsonify(serialize_plan(db, pid))


init_db()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
