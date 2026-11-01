# StudioSpace — Backend Server

**Project:** StudioSpace — Peer-to-Peer Creative Workspace & Production Studio Sharing Platform

## Live Deployment

- **Website:** https://studio-space-mdriyan143.vercel.app/
- **Backend API Server:** https://studio-server-zeta.vercel.app/


## About the Backend

StudioSpace Backend is a RESTful API built with Express.js and MongoDB. It handles studio listings, booking reservations, reviews, and saved studio wishlists.

The server communicates with the Next.js frontend and uses Better Auth JWT verification to authenticate protected API requests.

## Key Features

- **Studio Management:** Create, retrieve, update, and delete studio listings.
- **Studio Discovery:** Retrieve all available studios and individual studio details.
- **User Listings:** Retrieve studios belonging to the authenticated user.
- **Booking Management:** Create reservations, retrieve personal bookings, and manage hosted bookings.
- **Availability Checking:** Check studio booking availability before making reservations.
- **Booking Status Management:** Cancel bookings and update reservation statuses.
- **JWT Authentication:** Verify authentication tokens using Better Auth JWKS and the JOSE library.
- **Review System:** Submit reviews and retrieve reviews for individual studios.
- **Wishlist Management:** Add and remove favorite studios and retrieve saved studio information.
- **MongoDB Integration:** Store and manage application data using MongoDB collections.
- **CORS Configuration:** Allow secure communication between the frontend and backend.

## Technology Stack

- Node.js
- Express.js 5
- MongoDB 7
- JavaScript (ES Modules)
- Better Auth JWT
- JOSE
- CORS
- dotenv
- Nodemon

## API Endpoints

### Base URL

```text
YOUR_DEPLOYED_SERVER_URL
```

### Studio APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/studios` | Get all studios |
| GET | `/studios/mine` | Get authenticated user's studios |
| GET | `/studios/:id` | Get studio details |
| POST | `/studios` | Create a studio |
| PATCH | `/studios/:id` | Update a studio |
| DELETE | `/studios/:id` | Delete a studio |

### Booking APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/bookings/availability/:studioId` | Check studio availability |
| GET | `/bookings/mine` | Get user's bookings |
| GET | `/bookings/hosting` | Get hosted studio bookings |
| POST | `/bookings` | Create a booking |
| PATCH | `/bookings/:id/cancel` | Cancel a booking |
| PATCH | `/bookings/:id/status` | Update booking status |

### Review APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reviews/studio/:studioId` | Get studio reviews |
| POST | `/reviews` | Submit a review |

### Wishlist APIs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/wishlist/ids` | Get saved studio IDs |
| GET | `/wishlist` | Get wishlist studios |
| POST | `/wishlist/:studioId` | Save a studio |
| DELETE | `/wishlist/:studioId` | Remove a saved studio |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Check server status |

## Installation and Local Setup

### Prerequisites

- Node.js (LTS recommended)
- npm
- MongoDB database
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/mdriyan143/studio_server.git
```

### 2. Navigate to the Server Directory

```bash
cd studio_server
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
DB_NAME=studiospace
CLIENT_URL=http://localhost:3000
```

**Environment Variable Description:**

- `PORT`: Backend server port.
- `MONGODB_URI`: MongoDB connection string.
- `DB_NAME`: MongoDB database name.
- `CLIENT_URL`: Frontend URL used for CORS and Better Auth JWKS verification.

### 5. Start the Development Server

```bash
node index.js
```

Alternatively, use Nodemon:

```bash
npx nodemon index.js
```

The server will run at:

```text
http://localhost:8000
```

### 6. Verify Server Status

Open the following URL:

```text
http://localhost:8000/
```

Expected response:

```json
{
  "success": true,
  "message": "StudioSpace server is running!"
}
```

## Authentication and Security

- Better Auth provides authentication through the frontend.
- The backend verifies JWT tokens using the Better Auth JWKS endpoint.
- Protected API requests require a valid Bearer token in the Authorization header.
- Invalid or expired tokens receive a `401 Unauthorized` response.
- Authenticated user information is attached to the request for protected operations.
- CORS is configured to allow requests from the frontend with credentials.

## Project Structure

```text
studio_server/
│
├── config/
│   └── db.js
│
├── middleware/
│   └── verifyToken.js
│
├── routes/
│   ├── studioRoutes.js
│   ├── bookingRoutes.js
│   ├── reviewRoutes.js
│   └── wishlistRoutes.js
│
├── .gitignore
├── index.js
├── package.json
├── package-lock.json
└── vercel.json
```

## Deployment

The backend can be deployed using platforms such as Vercel or Render.

Configure the required environment variables in the deployment platform:

- `PORT`
- `MONGODB_URI`
- `DB_NAME`
- `CLIENT_URL`

Make sure `CLIENT_URL` points to the deployed frontend so that CORS and JWT verification work correctly.

## Project Submission

- **Client Repository:** https://github.com/mdriyan143/studio-space
- **Server Repository:** https://github.com/mdriyan143/studio_server
- **Live Website:** https://studio-space-mdriyan143.vercel.app/

---

**StudioSpace Backend** — Powering creative workspace discovery, studio management, and seamless booking experiences.
