# Training Program 26T1

- Poseidon Team

# How to run

How to run

With Docker (both services together)

- `docker build -t poseidon .`
- `docker run -p 3000:3000 -p 5000:5000 poseidon`

Separately

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

Locally (without Docker)

Backend:
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py

Frontend (separate terminal):
cd frontend
npm install
npm run dev

- Flask runs on port 5000, Next.js on port 3000.
