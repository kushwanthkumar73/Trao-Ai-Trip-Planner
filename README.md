# 🧳 Trao — AI Travel Planner

A secure, multi-user, full-stack web application that generates complete, structured travel
itineraries using an LLM agent. Users describe a trip — destination, duration, budget, interests —
and the AI returns a day-by-day plan, a cost breakdown, hotel suggestions, and a destination-aware
packing checklist. Every itinerary is editable: add or remove activities, or regenerate a single
day with natural-language feedback (e.g. *"make Day 3 more outdoorsy"*).

> **Live App:** `[ADD DEPLOYED FRONTEND URL HERE]`
> **API:** `[ADD DEPLOYED BACKEND URL HERE]`
> **Video Walkthrough:** `[ADD VIDEO LINK HERE]`

---

## 1. Project Overview

The app solves a real planning problem: building a day-by-day itinerary, estimating costs, and
picking hotels usually means twenty browser tabs and hours of manual research. Trao collapses that
into one prompt-driven flow, while still giving the user full editorial control over the AI's
output — nothing is locked once generated.

Each user has a private, authenticated dashboard. Trips are strictly isolated per user at the
database query level, so no one can ever read or modify another user's itinerary.

---

## 2. Tech Stack & Justification

| Layer | Technology | Why |
|---|---|---|
| Frontend | **React (Vite)** + Tailwind CSS + React Router | The assessment brief lists Next.js *or equivalent*. This app is a fully client-rendered, authenticated dashboard with no SEO/SSR requirement — Vite+React gives the same component model and DX as Next.js with a much faster build loop, which mattered under the assessment's time constraint. Routing is handled client-side via `react-router-dom`, mirroring Next's App Router structure (`pages/Login`, `pages/Register`, `pages/Dashboard`). |
| Backend | **Node.js + Express.js** | As specified. REST API, clear controller/route/model separation. |
| Database | **MongoDB Atlas + Mongoose** | Itineraries are naturally nested, variable-shaped documents (days → activities, hotels, packing items) — a document DB avoids the join overhead a relational schema would need here. |
| Auth | **JWT + bcryptjs** | Stateless auth suited to a decoupled frontend/backend deployed on separate hosts (Vercel + Render). |
| AI | **Google Gemini 2.5 Flash** (`generateContent`, JSON mode) | As specified. Used with `responseMimeType: application/json` and a strict schema in the prompt, so the model returns parseable structured data directly. |
| Language | JavaScript (Node/Express + React) | Chosen over TypeScript to maximize implementation speed within the assessment window; trade-off discussed in §8. |

---

## 3. High-Level Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌────────────────────┐
│   React (Vite) Client   │  REST  │   Express.js API Server  │  HTTPS │   Google Gemini API │
│  Auth state, Dashboard, │ ─────► │  Auth middleware enforces│ ─────► │  Structured JSON     │
│  Itinerary editor       │  JWT   │  req.user.id on every     │        │  itinerary/budget/    │
│                          │ ◄───── │  trip query/mutation      │ ◄───── │  hotels/packing       │
└─────────────────────────┘  JSON  └──────────────┬────────────┘        └────────────────────┘
                                                    │
                                                    ▼
                                          ┌──────────────────┐
                                          │  MongoDB Atlas    │
                                          │  Users / Trips     │
                                          │  (userId-scoped)   │
                                          └──────────────────┘
```

**Request flow for itinerary generation:**
1. Client sends `POST /api/trips/generate` with `Authorization: Bearer <JWT>`.
2. `auth.js` middleware verifies the JWT, attaches `req.user.id`.
3. `tripController.generateNewTrip` builds a schema-constrained prompt and calls Gemini.
4. Gemini response is parsed as JSON and validated against the Mongoose `Trip` schema.
5. The trip is saved with `userId: req.user.id` and returned to the client.

---

## 4. Authentication & Authorization Approach

- **Passwords** are hashed with `bcryptjs` (salt rounds = 10) before storage — plaintext passwords
  are never persisted or logged.
- **Login/Register** issue a signed JWT (`jsonwebtoken`, 7-day expiry) containing the user's `id`.
- **Every protected route** (all of `/api/trips/*`, `/api/auth/me`) runs through `middleware/auth.js`,
  which rejects requests with a missing/malformed/expired token (`401`/`400`) before the controller
  ever executes.
- **Authorization (not just authentication)** is enforced at the data layer, not just the route
  layer: every trip query is filtered by `{ _id: req.params.id, userId: req.user.id }`. A valid,
  logged-in User B sending a request for User A's trip ID gets a `404`, not the data — this is the
  strict multi-user isolation the brief requires, verified by querying as two different accounts.

---

## 5. AI Agent Design & Purpose

Two distinct AI calls, both against Gemini 2.5 Flash with `responseMimeType: "application/json"`:

1. **`generateNewTrip`** — given destination, duration, budget tier, and interests, the prompt asks
   the model to return a single JSON object matching the exact `Trip` schema shape (itinerary array,
   hotels array, budget breakdown object, packing list array) in one call. This keeps the backend
   from needing four separate AI calls and four separate failure points.
2. **`regenerateDay`** — given the *existing* activities for one day plus the user's free-text
   feedback, the model returns only that day's replacement activities. The rest of the trip is left
   untouched, so a user tweaking Day 3 doesn't risk the AI silently rewriting Day 1.

**Resilience:** Gemini calls are wrapped in `fetchWithRetry`, an exponential-backoff retry (5
attempts, delay doubling from 1s) that specifically retries on HTTP 429 (rate limit) and transient
network failures, surfacing a clean `500` with a user-facing message only after retries are
exhausted — the raw API error never leaks to the client.

**Why this design:** forcing one structured JSON contract (rather than free-text the backend has to
parse) eliminates an entire class of "AI said something unparseable" bugs, and keeps the AI's job
narrow and verifiable against the Mongoose schema.

---

## 6. Creative / Custom Feature: AI Weather-Aware Packing Assistant

**What it is:** alongside the itinerary, the same generation call asks Gemini to act as a packing
specialist and produce a categorized checklist — *Documents*, *Clothing*, *Gear*, *Other* — derived
from the destination's typical climate **and** the specific activities already in the itinerary
(e.g. hiking boots only appear if a hike was actually planned; sunscreen/rain gear only appear if
the climate calls for it). Each item is an interactive checkbox the user can toggle, and the
checked state persists to MongoDB.

**Why I built this:** every other itinerary generator stops at "what to do" and "what it costs."
The genuinely useful — and overlooked — question is "what do I need to bring," and answering it
*well* requires combining two pieces of context most planners never connect: the climate of the
destination and the actual activities chosen for the trip. A generic "Tokyo packing list" is much
less useful than a list that knows you're hiking Day 2 and need boots, or that you booked a winter
trip and need thermals. This demonstrates the AI being used for genuine synthesis (cross-referencing
two data points) rather than just templated text generation.

**Problem it solves:** reduces a traveler's pre-trip mental overhead from "research weather +
research activities + remember what each implies" down to one auto-generated, already-relevant list.

---

## 7. Key Design Decisions & Trade-offs

| Decision | Reasoning | Trade-off accepted |
|---|---|---|
| One combined Gemini call for itinerary + budget + hotels + packing, instead of four calls | Fewer round trips, fewer failure points, lower latency for the user | Larger single prompt/response; a malformed JSON anywhere fails the whole generation (mitigated by strict `responseMimeType: json` + retry) |
| `userId` filtering on every Mongo query instead of a separate authorization layer/ACL table | Simplest correct implementation for a single-owner-per-resource model; matches the brief's isolation requirement directly | Wouldn't scale to shared/collaborative trips without a schema change (not a requirement here) |
| JWT (stateless) over server-side sessions | Frontend and backend are deployed on different hosts (Vercel/Render); stateless auth avoids needing shared session storage | No server-side token revocation before expiry (7 days) — acceptable for an assessment-scope app |
| React + Vite instead of Next.js | Faster iteration under the assessment deadline; no SSR/SEO need for an authenticated dashboard | Doesn't demonstrate Next.js-specific patterns (App Router, server components) if those were specifically being evaluated |
| JavaScript instead of TypeScript | Maximized feature velocity in the available time | No compile-time type safety on the Trip/User shapes — mitigated by strict Mongoose schemas validating at the data layer |

---

## 8. Known Limitations

- No refresh-token rotation — JWT simply expires after 7 days and the user has to log in again.
- No automated test suite (unit/integration) due to the assessment timeline; manual verification
  checklist below was used instead.
- Gemini's JSON output, while schema-constrained via prompt instructions, is not 100% guaranteed —
  the `timeOfDay` enum was deliberately widened (`Morning/Late Morning/Lunch/Afternoon/Late
  Afternoon/Evening/Night`) after observing real model output, rather than over-constraining the
  prompt and risking generation failures.
- No image generation/visuals for hotels or destinations — text-only recommendations.
- No rate limiting on the API itself (beyond Gemini's own), so a malicious user could spam trip
  generation; acceptable for assessment scope, would add `express-rate-limit` for production.

---

## 9. Project Structure

```
ai-travel-planner/
├── backend/
│   ├── config/db.js            # MongoDB connection
│   ├── middleware/auth.js      # JWT verification
│   ├── models/User.js          # User schema (hashed password)
│   ├── models/Trip.js          # Trip schema (itinerary, hotels, budget, packing list)
│   ├── controllers/authController.js
│   ├── controllers/tripController.js  # AI generation, CRUD, regenerate-day, backoff retry
│   ├── routes/authRoutes.js
│   ├── routes/tripRoutes.js
│   └── server.js
└── frontend/
    └── src/
        ├── context/AuthContext.jsx     # Global auth state
        ├── utils/api.js                # Central fetch client, injects JWT header
        ├── components/CreateTripForm.jsx
        ├── components/ItineraryCard.jsx  # Add/remove activity, regenerate day
        ├── components/PackingList.jsx    # Creative feature UI
        ├── components/ProtectedRoute.jsx
        └── pages/Login.jsx, Register.jsx, Dashboard.jsx
```

---

## 10. Setup Instructions (Local)

### Backend
```bash
cd backend
npm install
cp .env.example .env
# Fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev
```
Runs on `http://localhost:5000`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_URL=http://localhost:5000
npm run dev
```
Runs on `http://localhost:5173`.

### Environment Variables

**backend/.env**
```
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=any_long_random_string
GEMINI_API_KEY=your_google_ai_studio_key
```

**frontend/.env**
```
VITE_API_URL=http://localhost:5000
```

---

## 11. Setup Instructions (Deployed)

- **Backend** deployed on Render — environment variables (`MONGO_URI`, `JWT_SECRET`,
  `GEMINI_API_KEY`) set in the Render dashboard, never committed to the repo.
- **Frontend** deployed on Vercel — `VITE_API_URL` set to the deployed Render backend URL as a
  Vercel environment variable.
- MongoDB Atlas Network Access configured to allow Render's outbound IPs (or `0.0.0.0/0` for
  assessment scope).

---

## 12. API Endpoints

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /api/auth/register | No | Register new user |
| POST | /api/auth/login | No | Login, returns JWT |
| GET | /api/auth/me | Yes | Get current user |
| POST | /api/trips/generate | Yes | AI-generate a new trip |
| GET | /api/trips | Yes | List user's trips (isolated) |
| GET | /api/trips/:id | Yes | Get single trip |
| PUT | /api/trips/:id | Yes | Update trip fields |
| DELETE | /api/trips/:id | Yes | Delete trip |
| POST | /api/trips/:id/activity | Yes | Add activity to a day |
| DELETE | /api/trips/:id/activity | Yes | Remove activity from a day |
| POST | /api/trips/:id/regenerate-day | Yes | AI-regenerate one day with feedback |

---

## 13. Manual Verification Checklist

- [x] `GET /api/trips` without Authorization header → `401`
- [x] User A's trips never visible/accessible to User B (tested with two separate accounts)
- [x] Invalid/expired Gemini key → console shows exponential backoff retries before a clean `500`
- [x] Mobile viewport → cards stack vertically, layout remains usable
- [x] Add / remove activity updates persist to MongoDB and reflect immediately in UI
- [x] Regenerate Day replaces only the targeted day, rest of itinerary untouched
- [x] Packing checklist toggle state persists across page refresh