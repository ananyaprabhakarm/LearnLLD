# LearnLLD

LearnLLD is a practice space for low-level design. Its editor lets you build UML class diagrams with React Flow, while a FastAPI service provides an initial API for saving diagrams.

## Project status

- **Frontend:** React 19, TypeScript, Vite, and `@xyflow/react`.
- **Backend:** FastAPI, Pydantic, SQLAlchemy, and SQLite.
- **Editor:** Create and edit classes inline, connect classes, manage relationships, and select, copy, paste, or delete diagram elements.
- **Persistence:** The API and frontend API client are implemented. The editor currently keeps workspace and canvas state in React; it does not yet load or save diagrams through the API.
- **Accounts:** No authentication or user accounts yet.

## Run the frontend

```sh
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173`). To type-check and build for production:

```sh
npm run build
```

## Run the backend

In a second terminal:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`; interactive API documentation is at `http://localhost:8000/docs`. See [backend/README.md](backend/README.md) for the API contract, tests, configuration, and deployment notes.

## Frontend and backend configuration

The frontend API client reads `VITE_API_BASE_URL` from `frontend/.env.local`. Copy the example file and set the backend origin if needed:

```sh
cp frontend/.env.example frontend/.env.local
```

The default is `http://localhost:8000`. The backend's `FRONTEND_ORIGINS` setting controls allowed browser origins; its local default is `http://localhost:5173`. Restart Vite after changing frontend environment variables.

## Repository layout

```text
frontend/
  src/App.tsx                 Workspace, canvas, and editor state
  src/components/             UML class nodes and editor UI
  src/diagram/types.ts        UML classes, attributes, methods, and relationships
  src/api/diagrams.ts         Typed client for the diagram API
  public/assets/              Logo and browser icons
backend/
  app/                        FastAPI routes, schemas, models, and database setup
  tests/                      API tests using a separate temporary database
```

## Current limitations

The MVP supports one workspace with multiple named canvases in the current browser session. Data resets when the page is refreshed. Connecting the editor to the API, adding multiple workspaces, and adding accounts are future work. SQLite is suitable for local development and a small MVP; see the backend guide for production limitations.
