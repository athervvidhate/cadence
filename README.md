# DischargeCoach (Cadence)

Role 3 backend and agent architecture workspace for the DischargeCoach hackathon build.

## Project Structure
- `ml_pipeline/` Role 2 deterministic/ML extraction and rule engine.
- `backend/` Express API gateway + MongoDB models + scheduler + escalation wiring.
- `agents/` Three agent handlers with local HTTP shim for development.
- `docs/api.md` Locked API contract reference.
- `docs/schemas.md` MongoDB schema reference.

## Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env
npm run dev
```

## Agent Shim Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r agents/requirements.txt
uvicorn agents.shim.http_shim:app --host 127.0.0.1 --port 8001 --reload
```

## Backend Test Suite
```bash
cd backend
npm test
```

## Built With
Node.js, Express, MongoDB (Mongoose), Python, FastAPI, Fetch-style agent contracts, Twilio, Nodemailer.

## Disclaimer
Not a medical device. Not for clinical use. Hackathon prototype only.