# LearnLLD — LLD Learning Platform

The first milestone is a small browser based UML diagram editor shell built with React, TypeScript, Vite, and React Flow (`@xyflow/react`).

## Run it

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` checks TypeScript and creates a production build; `npm run preview` serves that build locally.

## Try the canvas

- Drag the example `User` and `Order` nodes to reposition them.
- Drag from a small node handle to another node to connect them.
- Use the controls at bottom left or the mouse wheel to zoom; drag the blank canvas to pan.
- Use the `Class` tool on the left to add a temporary class node.

The editor currently keeps its data in React state for this page session. It does not save diagrams yet.

## Your first implementation task

Create these two files:

1. `src/diagram/types.ts` — define your durable diagram data model and TypeScript types. Include a class node's stable ID, position, name, attributes, and methods, plus a relationship/edge type with source and target IDs. Keep it serializable as plain data so it can later be saved or evaluated. The model should not depend on React Flow's runtime objects.
2. `src/components/ClassNode.tsx` — implement a reusable React Flow node that displays the class name, attributes, and methods. Use the `NodeProps` type from `@xyflow/react`; expose connection handles so nodes can be linked.

Acceptance criteria:

- `types.ts` has explicit types for a diagram, class node, attribute, method, and relationship, with no `any` types.
- `ClassNode.tsx` renders the class name in a header, attributes and methods in separate sections, and provides source/target handles.
- The component receives data through React Flow node props and has no knowledge of the app's toolbar or canvas state.
- Keep the node's visual styling in `src/styles.css` or a small adjacent stylesheet; do not add persistence or other features yet.

After your implementation, the next integration step will replace the marked temporary node and shape in `src/App.tsx` with your component and model. The current `TemporaryClassData`, `DiagramNode`, and `TemporaryClassNode` definitions are intentionally local, clearly marked scaffolding.

## React Flow concepts in this shell

- A **node** has a stable `id`, a canvas `position`, a `type`, and `data` passed to its node component.
- An **edge** refers to nodes with `source` and `target` IDs. `onConnect` turns a drag between handles into an edge.
- `useNodesState` and `useEdgesState` hold the current graph and provide change handlers for dragging and edge interaction. These are convenient for the shell; your durable model can stay independent and be mapped to and from React Flow later.
- `<Background />`, `<Controls />`, and `<MiniMap />` are built-in canvas helpers. `<ReactFlow />` provides dragging, panning, zooming, and connection gestures.
