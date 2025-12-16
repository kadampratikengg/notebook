This repository is a small two‑tier web app (backend + CRA frontend). Keep guidance short and focused on patterns discoverable in code.

## Big picture & routing

- **Backend (`server/`)**: Express app. Routers are mounted under `/api` in `server/server.js` (e.g. `/api/submit`, `/api/submissions`, `/api/download`).
- **Frontend (`client/`)**: Create‑React‑App. Shared axios helper at `client/src/api/api.js` attaches `Authorization: Bearer <token>` from `localStorage` and normalizes responses.

## Key domains & where to look

- **Submissions**: `server/models/Submission.js`, `server/routes/submissions.js` — POST `/submit` validates `trip` & `splitWith` against `Trip.participants`.
- **Trips**: `server/models/Trip.js`, `server/routes/trips.js` — `joinCode` is unique; creation/deletion requires auth; `authOptional` is used for public reads.
- **Auth**: `server/routes/auth.js`, `server/middleware/auth.js` — JWT-based; set `JWT_SECRET` in prod.

## Environment & run commands

- Server: set `MONGO_URI`, `JWT_SECRET`, and optionally `ALLOWED_ORIGINS` or `FRONTEND_URL` (comma-separated) for CORS. Dev: `cd server && npm run dev`.
- Client: set `REACT_APP_API_URL` **including** `/api` (e.g. `http://localhost:5000/api`) to avoid mismatches with the code; run `cd client && npm start`.

## Project-specific patterns & gotchas

- **API prefix mismatch**: axios default base includes `/api`. If you override `REACT_APP_API_URL`, prefer including `/api` so `window.open(...)` download links and `api` calls line up.
- **Submissions ↔ Trips**: submissions with `trip` require payer and split names to match trip participants — update both client and server when changing that shape.
- **Excel export**: `server/routes/submissions.js` writes `Submissions.xlsx` to the server working dir (uses `xlsx.writeFile()`); tests/CI should clean or write to a temp path.
- **Leaflet**: loaded via CDN in `client/public/index.html`. Components rely on a global `L` — do not add a local Leaflet package without updating the HTML/imports.
- **Geolocation**: client may use `navigator.geolocation` to fill `location`; browser permission & HTTPS required in prod.

## Auth notes for agents

- Use `/api/auth/*` for register/login/me. Login returns a token which the client stores in `localStorage` and the axios instance attaches to requests.
- `server/middleware/auth.js` returns 401 on missing/invalid tokens; many routes rely on `auth` or `authOptional` behaviors.

## Debugging & conventions

- Logs often include emojis (e.g. `✅`, `❌`) — helpful search tokens.
- API errors consistently return `{ error: 'message' }` and `client/src/api/api.js` normalizes error shapes; rely on that when writing client code.

## Quick example

- POST `/api/submit` body example:

```json
{
  "name": "Siddhesh",
  "date": "2025-12-09T06:30:00.000Z",
  "location": "18.5204,73.8567",
  "amount": 250.0,
  "paymentMode": "Online",
  "description": "Payment",
  "trip": "<tripId>",
  "splitWith": ["Siddhesh", "Omkar"]
}
```

## Files to inspect when changing behavior

- `server/server.js`, `server/routes/*.js`, `server/models/*.js`
- `client/src/api/api.js`, `client/src/components/SubmissionForm.js`, `client/public/index.html`

If you'd like, I can add CI/test recipes, or expand a CONTRIBUTING section with run/debug notes. Any part unclear or missing? 📋
This repository is a small two-tier web app: a Node/Express backend and a Create-React-App frontend.

Keep guidance concise and focused on patterns discoverable in the codebase.

-- Big picture

- **Backend**: `server/server.js` — Express app exposing these endpoints: `POST /submit`, `GET /submissions`, `GET /download`, and `GET /` (health). Data is persisted with **Mongoose** using the model in `server/models/Submission.js`.
- **Frontend**: `client/` — CRA app. The main form UI is `client/src/components/SubmissionForm.js`. The front-end calls the backend via `axios` and reads the base URL from `process.env.REACT_APP_API_URL`.
- **Data flow**: The form POSTs JSON to `/submit`; backend saves a `Submission` (see schema fields in `server/models/Submission.js`) and the frontend refreshes with `GET /submissions`. The `GET /download` route generates an Excel file with `xlsx` and sends it using `res.download()`.

-- Environment & run commands

- **Server env**: set `MONGO_URI` in `server/.env` (or environment) — `server/server.js` reads `process.env.MONGO_URI`. Optional `PORT` defaults to 5000.
- **Client env**: set `REACT_APP_API_URL` (e.g. `http://localhost:5000`). The client reads this in `SubmissionForm.js` as `process.env.REACT_APP_API_URL`.
- **Run locally (two terminals)**:
  - `cd server` then `npm run dev` (uses `nodemon`) to run the backend.
  - `cd client` then `npm start` to run the React app on `http://localhost:3000`.

-- Notable implementation details & conventions

- **Strict schema**: `Submission` fields (see `server/models/Submission.js`) — `name`, `date` (`Date`), `location`, `amount` (`Number`), `paymentMode` (enum `['Online','Cash']`), `description`. Use these exact keys when sending JSON from the client.
- **Dates**: Backend expects `date` to be a valid ISO date — the frontend formats an IST-local `datetime-local` string and the server wraps it with `new Date(req.body.date)` before saving.
- **CORS**: `server/server.js` uses a whitelist (`allowedOrigins`) which includes `http://localhost:3000` and the deployed frontend URL. When adding new dev origins, update this list.
- **Excel export**: The backend creates `Submissions.xlsx` using `xlsx.writeFile(workbook, filePath)` with a relative `filePath`. File is created in the server's working directory — tests or CI should clean up or use a temp path if needed.
- **Leaflet**: The client loads Leaflet via CDN in `client/public/index.html`. Code in `SubmissionForm.js` uses a global `L`; don't add a local Leaflet NPM package without updating the HTML and imports.
- **Geolocation**: The client tries `navigator.geolocation` to auto-fill `location` — this requires browser permission or HTTPS in production.

-- Debugging & logs

- Backend uses `console.log` / `console.error` with emoji prefixes (e.g. `✅`, `❌`) in `server/server.js` — look for those strings when searching logs.
- Typical failure points: missing `MONGO_URI`, blocked CORS origin, or geolocation permission errors in the browser console.

-- Quick code examples

- Example POST body (from frontend):
  {
  "name": "Siddhesh",
  "date": "2025-12-09T12:00",
  "location": "18.5204,73.8567",
  "amount": 250.0,
  "paymentMode": "Online",
  "description": "Payment for X"
  }

- Example client base URL env (in Windows `cmd.exe`) — create `.env` in `client`:
  REACT_APP_API_URL=http://localhost:5000

-- What to preserve / avoid changing

- Keep route signatures intact (`/submit`, `/submissions`, `/download`) — the frontend depends on them.
- Keep the `Submission` schema keys and `paymentMode` enum values unchanged unless you update both client and server code.
- Leaflet usage depends on the CDN link in `client/public/index.html` and the global `L` variable.

-- Files to inspect for patterns

- `server/server.js` — routing, CORS, Mongoose connection, Excel export.
- `server/models/Submission.js` — canonical schema and types.
- `server/package.json` — `start` and `dev` scripts.
- `client/src/components/SubmissionForm.js` — UI logic, axios calls, geolocation, date handling, map rendering.
- `client/public/index.html` — Leaflet CDN + global dependencies.

If any part of this guidance is unclear or you'd like me to expand a section (for example, CI, tests, or a CONTRIBUTING guide), tell me which area and I'll iterate.
