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

The current diagram is held in React state for the page session. There is no persistence or backend yet.

## Frontend structure

- `frontend/src/App.tsx` — workspace, React Flow state, class editing, and edge actions.
- `frontend/src/diagram/types.ts` — serializable UML classes, attributes, methods, and relationships.
- `frontend/src/components/ClassNode.tsx` — reusable UML class node.
- `frontend/public/assets/` — LearnLLD logo and browser icons.
- `frontend/package.json` — frontend scripts and dependencies.
