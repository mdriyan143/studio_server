# StudioSpace — Backend Server

REST API for StudioSpace, built with Express and MongoDB. It handles studios, bookings, reviews, wishlists and notifications, and verifies Better Auth JWTs.

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

Add these scripts to `package.json` (they are not there yet):

```json
"scripts": {
  "start": "node index.js",
  "dev": "nodemon index.js"
}
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
npm run dev
```

Open http://localhost:8000/ and you should see `{"success":true,"message":"StudioSpace server is running!"}`.

`CLIENT_URL` must match the client URL exactly (no trailing slash). It is used for CORS and to load the public keys from `CLIENT_URL/api/auth/jwks`.

## Security (JWT)

Users log in with Better Auth on the client. Protected calls go through the client's `/api/proxy`, which creates a JWT and sends it as a Bearer token. `verifyToken` checks it with the Better Auth JWKS and returns `401` if it is missing, expired or invalid. The user id, email, name and image are read from the token, never from the request body.

## Booking Rules

- Status flow: `Pending` → `Confirmed` → `Completed`, or `Cancelled`.
- Date must not be in the past, and end time must be after start time.
- You can't book your own studio.
- **Double-booking prevention:** before a booking is saved, and again when the host confirms it, the server looks for a Confirmed booking on the same studio and date with an overlapping time. If one exists it returns `409`.
- A guest can cancel only their own Pending booking. Only the host can confirm, decline or complete.
- Reviews need a Completed booking, and the studio's average rating is recalculated after each review.
- Booking changes create a notification for the other user. A failed notification never breaks the booking.

## API Endpoints

`Auth` = needs a valid Bearer token.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | No | Health check |
| GET | `/studios` | No | List studios (`?limit`, `?category`, `?search`, `?ownerId`) |
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
| GET | `/notifications` | Yes | Latest 20 notifications and unread count |
| PATCH | `/notifications/read-all` | Yes | Mark all as read |
| PATCH | `/notifications/:id/read` | Yes | Mark one as read |

## Project Structure

```text
studio_server/
├── config/db.js
├── middleware/verifyToken.js
├── routes/
│   ├── studioRoutes.js
│   ├── bookingRoutes.js
│   ├── reviewRoutes.js
│   ├── wishlistRoutes.js
│   └── notificationRoutes.js
├── utils/notify.js
├── index.js
├── package.json
└── vercel.json
```

## Deployment

Deployed on Vercel (`vercel.json` routes everything to `index.js`). Set `MONGODB_URI`, `DB_NAME` and `CLIENT_URL` (the deployed client URL) in the project environment variables.
