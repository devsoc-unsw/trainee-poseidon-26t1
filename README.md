# freeup

> Training Program 26T1 - Poseidon Team

**freeup** is a desktop website for finding a time your friend group is actually
free. Share a link, everyone marks when they're free, and the best time surfaces
instantly - no accounts, no app download.

Built with a Next.js frontend and a Flask + SQLite backend.

---

## Features

### Create a plan (`/create`) - a 3-step flow
- Name the plan, pick a **type** (pregame, study, gym, dinner, gaming, concert,
  beach, other), set a **date window** (up to 14 days) and the **times of day**
  that matter (morning / afternoon / evening / night).
- Fill in **your own availability** on the grid first, so the crew gets a head
  start.
- Get a **shareable link** with one-tap share targets (WhatsApp, Discord,
  Message, Email) and an **invite list** to track who has replied.

### Respond to a plan (`/plan/<id>/respond`)
- Friends open the link, enter their name - **no account needed**.
- Mark availability on the grid with **soft availability**: `yeah` / `maybe` /
  `nah`, instead of a binary free/busy.
- The grid supports **drag-to-paint** - pick a brush, then click or drag across
  cells.
- A "you're in" confirmation screen wraps things up.

### Live results & lock-in (`/plan/<id>/results`)
- A **best-time callout** surfaces the single best window the moment people
  respond (scored as `yeah×2 + maybe`).
- A **live heatmap** shows availability across the whole grid; click any cell to
  pick a different time. Results **auto-refresh** every 12 seconds.
- See the **crew list** with who has responded vs. who's still waiting.
- **Nudge the slackers** - a one-tap reminder for people who haven't replied.
- **Lock it in** - confirm a time, add an optional spot and notes for the group.

### Post-plan (after a time is locked)
- **Final headcount** - each person is marked coming / maybe / can't, with a
  running count of who's in.
- **Who's bringing what** - a shared task list of items and who's responsible.
- The time can be **un-locked and changed** at any point.

### Landing page (`/`)
- Overview of how freeup works, plus a live count of plans made on the site.

---

## How to run

### With Docker (both services together)

```
docker build -t poseidon .
docker run -p 3000:3000 -p 5000:5000 poseidon
```

### Locally (without Docker)

**Backend** (Flask, port 5000):

```
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend** (Next.js, port 3000) - in a separate terminal:

```
cd frontend
npm install
npm run dev
```

Then open **http://localhost:3000**. The frontend proxies `/api/*` requests to
the Flask backend, so you only need to visit port 3000.

- Frontend: http://localhost:3000
- Backend health check: http://localhost:5000/api/health

The backend stores data in a SQLite file (`backend/freeup.db`) that is created
automatically on first run.

---

## API reference

All endpoints are served under `/api` and return JSON.

| Method | Endpoint | Purpose |
| ------ | -------- | ------- |
| `GET`  | `/api/health` | Service health check |
| `GET`  | `/api/stats` | Total plans made |
| `POST` | `/api/plans` | Create a plan |
| `GET`  | `/api/plans/<id>` | Full plan, responses and computed results |
| `POST` | `/api/plans/<id>/responses` | Submit / update an availability response |
| `POST` | `/api/plans/<id>/invite` | Add an invitee to the plan |
| `POST` | `/api/plans/<id>/nudge` | Send a nudge to non-responders |
| `POST` | `/api/plans/<id>/lock` | Lock in a time, spot and notes |
| `POST` | `/api/plans/<id>/unlock` | Re-open the plan to change the time |
| `POST` | `/api/plans/<id>/headcount` | Set a person's coming / maybe / can't status |
| `POST` | `/api/plans/<id>/items` | Add a "who's bringing what" item |
| `DELETE` | `/api/plans/<id>/items/<item_id>` | Remove an item |

---

## Tech stack

- **Frontend:** Next.js 14 (pages router), React 18
- **Backend:** Flask, SQLite (Python standard library)
- **Deployment:** single Docker image running both services via supervisord
