# Fullstack Todo App

A focused Todo application built with React, Node.js, and MongoDB. This project features user authentication, profile management, persistent task storage, and advanced scheduling with a command strip interface.

## Features

- **User Authentication**: Secure signup and login with JWT.
- **Profile Management**: Update user name, email, and password.
- **Task Management**: Create, view, toggle, and delete todos.
- **Due Dates & Times**: Assign precise deadlines to your objectives.
- **Command Strip Views**:
    - **All Tasks**: Shows tasks due from today through the configured horizon, plus unscheduled items.
    - **Today**: Focused view of immediate priorities.
    - **Calendar**: Visual monthly grid for tracking deadlines.
    - **Settings**: Local browser configuration for view horizons and defaults.
- **Responsive UI**: Modern, dark-mode focused interface.
- **Session Persistence**: Stay signed in across browser refreshes.
- **Local Settings**: App configurations (like visibility toggles) persist in `localStorage`.

## Tech Stack

- **Frontend**: React 19, Vite 8, Axios, CSS.
- **Backend**: Node.js, Express 5, Mongoose.
- **Database**: MongoDB (Local or Atlas).

## Prerequisites

- Node.js (Latest LTS recommended)
- MongoDB instance (Local or Atlas)
- npm

## Setup Instructions

### 1. Repository Configuration

Install dependencies for both components.

```bash
# Backend dependencies
npm --prefix backend install

# Frontend dependencies
   npm --prefix frontend install
```

### 2. Environment Variables

Create a `.env` file in the `backend/` directory.

```env
MONGODB_URI=mongodb://localhost:27017/todo-app
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
```

- `MONGODB_URI`: Your MongoDB connection string.
- `JWT_SECRET`: A secure string for signing tokens.
- `PORT`: (Optional) Backend port, defaults to 5000.

For the frontend, development uses a local backend at `http://localhost:5000` by default. In production the frontend is intended to talk to the backend on the same origin (requests to `/api/*`) so no API host is required when deploying the whole project to a single host (for example a Vercel single-project deployment).

If you intentionally want the frontend to call an external API host in production, set a non-empty value in `frontend/.env`:

```env
VITE_API_BASE_URL=http://your-api-url
```

Important: an empty string is not treated as an external host — the build will fall back to same-origin requests when `VITE_API_BASE_URL` is unset or empty.

For separate Vercel projects, set the frontend production env var in the Vercel dashboard instead:

```env
VITE_API_BASE_URL=https://todo-app-mini-project-20223150.vercel.app
```

For the backend Vercel project, set these production environment variables in the Vercel dashboard:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://todo-app-mini-project-20223150-mnwe.vercel.app
```

The backend project is configured for standalone Vercel deployment from the `backend/` directory via `backend/vercel.json`.

### 3. Running Locally

Start the backend and frontend in separate terminals.

**Backend:**
```bash
npm --prefix backend run dev
```

**Frontend:**
```bash
npm --prefix frontend run dev
```

The frontend will be available at `http://localhost:5173`.

## API Documentation

### Auth Routes (Public)
- `POST /api/auth/signup`: Create a new account.
- `POST /api/auth/login`: Authenticate and receive a JWT.

### Auth Routes (Protected)
- `GET /api/auth/me`: Fetch current user profile.
- `PUT /api/auth/me`: Update profile details (name, email).
- `PUT /api/auth/me/password`: Update user password.

### Todo Routes (Protected)
- `GET /api/todos`: List todos for the current user. Supports optional query params `view`, `start`, `end`, and `includeCompleted`.
- `POST /api/todos`: Create a new todo (backend accepts optional `dueAt`; the current frontend UI requires a due date/time when creating new tasks).
- `PUT /api/todos/:id`: Update todo status or schedule (`completed`, `dueAt`).
- `DELETE /api/todos/:id`: Remove a todo.

## Verification

To verify the installation:

1. **Linting**: Check frontend code quality.
   ```bash
   npm --prefix frontend run lint
   ```

2. **Build**: Ensure the frontend compiles for production.
   ```bash
   npm --prefix frontend run build
   ```

3. **Startup**: Verify the backend connects to MongoDB.
   ```bash
   npm --prefix backend run start
   ```

## Scope Note

Deployment instructions and automated tests are currently out of scope for this iteration. Local development and manual verification are the primary focus.
