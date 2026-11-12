# LearnLLD — LLD Learning Platform

LearnLLD is an interactive UML class diagram editor built with React, TypeScript, Vite, and React Flow. The frontend application lives in `frontend/` so a FastAPI backend can be added alongside it later.

## Run it

```sh
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Run `npm run build` in `frontend/` to type-check and create a production build; `npm run preview` serves that build locally.

## Try the canvas

- Drag nodes to reposition them, drag the blank canvas to pan, and use the controls or mouse wheel to zoom.
- Select a class and choose **Edit Class** to change its name, attributes, and methods.
- Add a class with the left toolbar. Connect node handles to create labeled, directional relationships; nodes can have multiple connections.
- Select a connection and use its delete action or press Delete/Backspace. Keyboard deletion is ignored while editing text fields.

## Workspaces and canvases

- The editor currently has one workspace. Edit its name in the left sidebar.
- Create a canvas with the **+** button beside **CANVASES**. New canvases start empty; the first canvas contains the `User`–`Order` example.
- Select a canvas in the sidebar to switch to it. Rename the active canvas by editing its title above the diagram.
- Each canvas keeps its own nodes and connections while you switch, so editing one canvas does not replace another canvas's diagram.
- Workspace and canvas data currently live in React state for the page session. The FastAPI backend and typed frontend API client are available, but the editor UI does not yet call the API to load or save canvases; refreshing still resets the editor.

Multiple workspaces and connecting editor save/load actions to the backend remain later milestones.

## Backend

The initial FastAPI API and its setup, endpoint contract, frontend connection steps, and SQLite deployment limits are documented in [backend/README.md](backend/README.md). To run it locally, create the backend virtual environment, install `backend/requirements.txt`, copy `backend/.env.example` to `backend/.env`, and start Uvicorn from `backend/`.

## Frontend structure

- `frontend/src/App.tsx` — single-workspace state, named canvas list and switching, React Flow state, class editing, and edge actions.
- `frontend/src/diagram/types.ts` — serializable UML classes, attributes, methods, and relationships.
- `frontend/src/components/ClassNode.tsx` — reusable UML class node.
- `frontend/public/assets/` — LearnLLD logo and browser icons.
- `frontend/package.json` — frontend scripts and dependencies.
- `frontend/src/api/diagrams.ts` — typed client for the diagram CRUD API.
- `backend/app/` — FastAPI routes, Pydantic schemas, SQLAlchemy model, configuration, and database lifecycle.
- `backend/tests/` — API tests using an isolated temporary SQLite database.
