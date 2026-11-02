# StudioSpace — Backend Server

REST API for StudioSpace (Express.js + MongoDB). It handles studios, bookings, reviews and wishlists, and verifies Better Auth JWTs.

- **Live Site:** https://studio-space-mdriyan143.vercel.app/
- **API Base URL:** https://studio-server-zeta.vercel.app/
- **Client Repo:** https://github.com/mdriyan143/studio-space
- **Server Repo:** https://github.com/mdriyan143/studio_server

## Tech Stack

Node.js, Express 5, MongoDB driver, jose (JWT/JWKS), CORS, dotenv, Nodemon.

## Local Setup

```bash
git clone https://github.com/mdriyan143/studio_server.git
cd studio_server
npm install
```

Create `.env`:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=studiospace
CLIENT_URL=http://localhost:3000
```

Run:

```bash
npm start      # node index.js
npm run dev    # nodemon index.js
```

Open http://localhost:8000/ and you should see `{"success":true,"message":"StudioSpace server is running!"}`.

`CLIENT_URL` must match the client URL exactly (no trailing slash). The server uses it for CORS and to load public keys from `CLIENT_URL/api/auth/jwks`.

## Security (JWT)

Users log in with Better Auth, which keeps the session in an HTTPOnly cookie. Protected calls go through the client's `/api/proxy`, which creates a JWT on the server and sends it as a Bearer token. This server verifies it with the Better Auth JWKS and returns `401 Unauthorized` if it is missing or invalid.

## Double-Booking Prevention

Before a booking is saved, and again when a host confirms it, the server looks for a Confirmed booking on the same studio and date whose time overlaps. If one exists it returns `409` with a clear message.

## API Endpoints

`Auth` = needs a valid Bearer token.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/studios` | No | List studios (`?limit`, `?category`, `?search`) |
| GET | `/studios/mine` | Yes | My studios |
| GET | `/studios/:id` | No | Studio details |
| POST | `/studios` | Yes | Add studio |
| PATCH | `/studios/:id` | Yes (owner) | Update studio |
| DELETE | `/studios/:id` | Yes (owner) | Delete studio |
| GET | `/bookings/availability/:studioId?date=` | No | Confirmed slots for a date |
| GET | `/bookings/mine` | Yes | My bookings |
| GET | `/bookings/hosting` | Yes | Bookings on my studios |
| POST | `/bookings` | Yes | Create booking (Pending) |
| PATCH | `/bookings/:id/cancel` | Yes | Cancel my pending booking |
| PATCH | `/bookings/:id/status` | Yes (host) | Confirm / Complete / Cancel |
| GET | `/reviews/studio/:studioId` | No | Studio reviews |
| POST | `/reviews` | Yes | Add review |
| GET | `/wishlist/ids` | Yes | Saved studio IDs |
| GET | `/wishlist` | Yes | Saved studios |
| POST | `/wishlist/:studioId` | Yes | Save a studio |
| DELETE | `/wishlist/:studioId` | Yes | Remove a saved studio |

## Project Structure

```text
studio_server/
├── config/db.js
├── middleware/verifyToken.js
├── routes/ (studioRoutes, bookingRoutes, reviewRoutes, wishlistRoutes)
├── index.js
├── package.json
└── vercel.json
```

## Deployment

Deployed on Vercel. Set `MONGODB_URI`, `DB_NAME` and `CLIENT_URL` (the deployed client URL) in the project environment variables.
