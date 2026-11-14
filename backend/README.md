# LearnLLD API

The backend is a small FastAPI application. Pydantic validates diagram requests, and SQLAlchemy stores each diagram as structured JSON in SQLite. Class positions and relationships are preserved as data; diagrams are not stored as images.

## Set up locally

Use Python 3.9 or newer:

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

The default database is `sqlite:///./learnlld.db`, relative to the `backend/` directory. Tables are created when the application starts. Set `DATABASE_URL` in `.env` or in the hosting environment to use another database.

## Start the API

From `backend/`, with the virtual environment active:

```sh
uvicorn app.main:app --reload
```

The API is at `http://localhost:8000`. Interactive request and response documentation is at `http://localhost:8000/docs`.

For a hosting platform that provides a `PORT` environment variable, start the ASGI app with:

```sh
uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

Set `FRONTEND_ORIGINS` to a comma-separated list of allowed browser origins. Locally, the default is `http://localhost:5173`; for deployment, include the deployed frontend origin.

## API endpoints

| Method | Path | Result |
| --- | --- | --- |
| `GET` | `/health` | Health status |
| `POST` | `/api/diagrams` | Create a diagram (`201`) |
| `GET` | `/api/diagrams` | List diagram IDs, titles, and timestamps |
| `GET` | `/api/diagrams/{diagram_id}` | Get one complete diagram |
| `PUT` | `/api/diagrams/{diagram_id}` | Replace its title, classes, positions, and relationships |
| `DELETE` | `/api/diagrams/{diagram_id}` | Delete a diagram (`204`) |

Create and update use the same complete request shape. Send all classes and relationships, using empty arrays when there are none:

```json
{
  "title": "Order Management",
  "classes": [
    {
      "id": "class-user",
      "name": "User",
      "position": { "x": 170, "y": 110 },
      "attributes": [{ "id": "attr-id", "name": "id", "type": "string" }],
      "methods": [{ "id": "method-place-order", "name": "placeOrder", "returnType": "Order" }]
    },
    {
      "id": "class-order",
      "name": "Order",
      "position": { "x": 500, "y": 260 },
      "attributes": [],
      "methods": []
    }
  ],
  "relationships": [
    {
      "id": "rel-user-order",
      "sourceId": "class-user",
      "targetId": "class-order",
      "kind": "association"
    }
  ]
}
```

Create and update responses include the submitted diagram data plus the server-generated `id`, `createdAt`, and `updatedAt` fields. A list response contains summaries with those identifiers, titles, and timestamps.

Supported relationship kinds: `inheritance`, `association`, `aggregation`, `composition`, and `dependency`. IDs must be unique within their collections, and each relationship's `sourceId` and `targetId` must reference existing classes. Invalid payloads and relationship references return `422` with validation details. Unknown diagrams return `404` with a detail message.

## Run tests

```sh
cd backend
source .venv/bin/activate
pytest
```

Tests use a temporary SQLite database separate from the development database.

## Connect the frontend

In another terminal, configure the Vite client:

```sh
cd frontend
cp .env.example .env.local
```

Set `VITE_API_BASE_URL=http://localhost:8000` in `frontend/.env.local`, then restart Vite. The typed client in `frontend/src/api/diagrams.ts` provides `createDiagram`, `listDiagrams`, `getDiagram`, `saveDiagram`, and `deleteDiagram`.

The client accepts `{ title, classes, relationships }`. Map React Flow nodes to UML classes using the node ID, name and position, plus `data.attributes` and `data.methods`; map edges to relationships using their ID, source, target, and kind. A canvas title maps to the API's diagram title. The editor does not yet call these client methods, so saving and loading are currently API/client capabilities rather than editor UI features.

## Deployment notes

Configuration comes from environment variables; see `.env.example`. SQLite is fine for local development and a small MVP, but it supports limited concurrent writes and some hosting filesystems are temporary. A local database file may be lost on redeploy or unavailable across multiple instances.

For a production PostgreSQL setup, point `DATABASE_URL` to PostgreSQL, install a SQLAlchemy-compatible driver such as `psycopg`, and add database schema migrations (for example, Alembic) before evolving the schema. This repository prepares the app for an ASGI host; it does not deploy the service.
