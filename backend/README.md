# LearnLLD Backend

The backend is a small FastAPI modular monolith. It validates UML diagram JSON with Pydantic and stores each saved diagram in one SQLAlchemy row using SQLite's JSON column. Class positions and relationships are saved as structured data, not as an image.

## Requirements and setup

Use Python 3.9 or newer.

```sh
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

The default database URL is `sqlite:///./learnlld.db`, relative to the backend working directory. Tables are created at application startup. Set `DATABASE_URL` in `.env` or the hosting environment to change the database.

## Run the API

```sh
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`; interactive OpenAPI docs are at `http://localhost:8000/docs`. For an ASGI host, use:

```sh
uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
```

Configure `FRONTEND_ORIGINS` as a comma-separated list, for example `http://localhost:5173`. The value controls CORS and can be set to the deployed frontend origin at hosting time.

## API contract

`POST /api/diagrams` creates a diagram and returns HTTP 201. `PUT /api/diagrams/{diagram_id}` replaces its complete content and returns HTTP 200. Both accept this JSON body; classes and relationships are complete arrays, including empty arrays when appropriate:

```json
{
  "title": "Order Management",
  "classes": [
    {
      "id": "class-user",
      "name": "User",
      "position": { "x": 170, "y": 110 },
      "attributes": [
        { "id": "attr-user-id", "name": "id", "type": "string" }
      ],
      "methods": [
        {
          "id": "method-place-order",
          "name": "placeOrder",
          "returnType": "Order"
        }
      ]
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

The create and update response contains the same `title`, `classes`, and `relationships`, plus a server-generated `id`, `createdAt`, and `updatedAt`. For example, a create response has this shape:

```json
{
  "id": "e9c076c1-b9cc-4fe2-8bdd-ecc730803fc6",
  "title": "Order Management",
  "classes": [
    {
      "id": "class-user",
      "name": "User",
      "position": { "x": 170, "y": 110 },
      "attributes": [
        { "id": "attr-user-id", "name": "id", "type": "string" }
      ],
      "methods": [
        {
          "id": "method-place-order",
          "name": "placeOrder",
          "returnType": "Order"
        }
      ]
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
  ],
  "createdAt": "2026-11-04T12:00:00Z",
  "updatedAt": "2026-11-04T12:00:00Z"
}
```

Relationship kinds are `inheritance`, `association`, `aggregation`, `composition`, or `dependency`. IDs must be unique in their collections, and both relationship endpoints must name existing class IDs. Unknown fields and invalid references return HTTP 422 with Pydantic validation details.

| Method and path | Result |
| --- | --- |
| `GET /health` | `{ "status": "ok" }` |
| `POST /api/diagrams` | Create; returns a complete saved diagram (201) |
| `GET /api/diagrams` | List diagram IDs, titles, and timestamps |
| `GET /api/diagrams/{diagram_id}` | Return one complete diagram |
| `PUT /api/diagrams/{diagram_id}` | Replace complete diagram content |
| `DELETE /api/diagrams/{diagram_id}` | Delete (204, no response body) |

Missing diagram IDs return HTTP 404 with a detail message. FastAPI's `/docs` page provides an interactive request builder.

## Run tests

```sh
cd backend
source .venv/bin/activate
pytest
```

Tests create a separate SQLite database under pytest's temporary directory. They do not use or clear the development database.

## Connect the frontend

In `frontend/`, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the backend origin, such as `http://localhost:8000`. Restart Vite after changing environment variables. The typed client in `frontend/src/api/diagrams.ts` exports `createDiagram`, `listDiagrams`, `getDiagram`, `saveDiagram`, and `deleteDiagram`.

The API client accepts `{ title, classes, relationships }`, matching `UMLDiagram` in `frontend/src/diagram/types.ts`. Convert React Flow nodes to UML classes (`id`, `name`, `position`, `data.attributes`, `data.methods`) and edges to relationships (`id`, `sourceId`, `targetId`, `kind`) before calling it. The workspace name remains frontend-only; each canvas title maps to one saved diagram. The existing editor is not yet wired to save or load controls.

## Deployment notes

Set `DATABASE_URL` and `FRONTEND_ORIGINS` in the hosting environment and start the ASGI app with the command above. SQLite is suitable for a small MVP, but it allows limited concurrent writes and many hosting platforms use ephemeral filesystems; a local SQLite file may disappear on redeploy or scale-out. For a production database, switch `DATABASE_URL` to a PostgreSQL SQLAlchemy URL, install a PostgreSQL driver such as `psycopg`, and add schema migrations (for example Alembic) before evolving the table. No deployment is performed by this project setup.
