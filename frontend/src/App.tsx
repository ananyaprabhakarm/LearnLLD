import { useCallback, useEffect, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type EdgeChange,
  type Edge,
  type NodeChange,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Brand from "./components/Brand";
import ClassNode from "./components/ClassNode";
import { ClassNodeActionsContext } from "./components/ClassNodeActionsContext";
import LandingPage from "./components/LandingPage";
import type { UMLClass, UMLClassNodeData } from "./diagram/types";

type DiagramNode = Node<UMLClassNodeData, "class">;
type DiagramCanvas = {
  id: string;
  name: string;
  nodes: DiagramNode[];
  edges: Edge[];
};

const initialClasses: UMLClass[] = [
  {
    id: "user",
    position: { x: 170, y: 110 },
    name: "User",
    attributes: [
      { id: "user-id", name: "id", type: "string" },
      { id: "user-name", name: "name", type: "string" },
    ],
    methods: [
      { id: "user-place-order", name: "placeOrder", returnType: "Order" },
    ],
  },
  {
    id: "order",
    position: { x: 500, y: 260 },
    name: "Order",
    attributes: [
      { id: "order-id", name: "id", type: "string" },
      { id: "order-status", name: "status", type: "string" },
    ],
    methods: [{ id: "order-cancel", name: "cancel", returnType: "void" }],
  },
];

const initialNodes: DiagramNode[] = initialClasses.map(
  ({ id, position, ...data }) => ({
    id,
    type: "class",
    position,
    data,
  }),
);

const relationshipEdgeOptions = {
  type: "default" as const,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#647c9f" },
  labelShowBg: true,
  labelBgStyle: { fill: "#ffffff" },
  labelBgPadding: [5, 2] as [number, number],
};

const initialEdges: Edge[] = [
  {
    id: "user-order",
    source: "user",
    target: "order",
    label: "association",
    ...relationshipEdgeOptions,
  },
];

const initialCanvas: DiagramCanvas = {
  id: "canvas-main",
  name: "Untitled diagram",
  nodes: initialNodes,
  edges: initialEdges,
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

const nodeTypes = { class: ClassNode };

function EditorWorkspace() {
  const [workspace, setWorkspace] = useState({
    name: "LearnLLD Workspace",
    canvases: [initialCanvas],
  });
  const [activeCanvasId, setActiveCanvasId] = useState(initialCanvas.id);
  const activeCanvas =
    workspace.canvases.find((canvas) => canvas.id === activeCanvasId) ??
    workspace.canvases[0];
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);

  const updateActiveCanvas = useCallback(
    (update: (canvas: DiagramCanvas) => DiagramCanvas) => {
      setWorkspace((current) => ({
        ...current,
        canvases: current.canvases.map((canvas) =>
          canvas.id === activeCanvasId ? update(canvas) : canvas,
        ),
      }));
    },
    [activeCanvasId],
  );

  const updateClassData = useCallback(
    (
      nodeId: string,
      update: (current: UMLClassNodeData) => UMLClassNodeData,
    ) => {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: update(node.data) } : node,
        ),
      }));
    },
    [updateActiveCanvas],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) => {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        nodes: applyNodeChanges(changes, canvas.nodes) as DiagramNode[],
      }));
    },
    [updateActiveCanvas],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        edges: applyEdgeChanges(changes, canvas.edges),
      }));
    },
    [updateActiveCanvas],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Append directly so parallel connections between the same handles are kept.
      updateActiveCanvas((canvas) => ({
        ...canvas,
        edges: [
          ...canvas.edges,
          {
            ...connection,
            id: createId("relationship"),
            label: "association",
            ...relationshipEdgeOptions,
          },
        ],
      }));
    },
    [updateActiveCanvas],
  );

  const onSelectionChange = useCallback(
    ({ edges: selectedEdges }: { nodes: DiagramNode[]; edges: Edge[] }) => {
      setSelectedEdgeIds(selectedEdges.map((edge) => edge.id));
    },
    [],
  );

  const deleteSelectedEdges = useCallback(() => {
    if (selectedEdgeIds.length === 0) return;
    updateActiveCanvas((canvas) => ({
      ...canvas,
      edges: canvas.edges.filter((edge) => !selectedEdgeIds.includes(edge.id)),
    }));
    setSelectedEdgeIds([]);
  }, [selectedEdgeIds, updateActiveCanvas]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || target.matches("input, textarea, [contenteditable='true']"))
      ) {
        return;
      }

      if (selectedEdgeIds.length === 0) return;
      event.preventDefault();
      deleteSelectedEdges();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelectedEdges, selectedEdgeIds.length]);

  const addClass = () => {
    const id = `class-${Date.now()}`;
    updateActiveCanvas((canvas) => ({
      ...canvas,
      nodes: [
        ...canvas.nodes,
        {
          id,
          type: "class",
          position: {
            x: 220 + (canvas.nodes.length % 4) * 50,
            y: 130 + (canvas.nodes.length % 4) * 50,
          },
          data: { name: "New Class", attributes: [], methods: [] },
        },
      ],
    }));
  };

  const addCanvas = () => {
    const canvas: DiagramCanvas = {
      id: createId("canvas"),
      name: `Canvas ${workspace.canvases.length + 1}`,
      nodes: [],
      edges: [],
    };
    setWorkspace((current) => ({
      ...current,
      canvases: [
        ...current.canvases.map((item) => ({
          ...item,
          nodes: item.nodes.map((node) => ({ ...node, selected: false })),
          edges: item.edges.map((edge) => ({ ...edge, selected: false })),
        })),
        canvas,
      ],
    }));
    setActiveCanvasId(canvas.id);
    setSelectedEdgeIds([]);
  };

  const selectCanvas = (canvasId: string) => {
    setWorkspace((current) => ({
      ...current,
      canvases: current.canvases.map((canvas) => ({
        ...canvas,
        nodes: canvas.nodes.map((node) => ({ ...node, selected: false })),
        edges: canvas.edges.map((edge) => ({ ...edge, selected: false })),
      })),
    }));
    setActiveCanvasId(canvasId);
    setSelectedEdgeIds([]);
  };

  const renameCanvas = (name: string) => {
    updateActiveCanvas((canvas) => ({ ...canvas, name }));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="workspace-title">
          <span>{workspace.name}</span>
          <strong>{activeCanvas.name}</strong>
        </div>
        <div className="topbar-spacer" />
        <span className="save-state">
          <span className="status-dot" />
          Local draft
        </span>
        <button
          className="share-button"
          type="button"
          disabled
          title="Saving and sharing arrive later"
        >
          Share
        </button>
      </header>

      <div className="workspace">
        <aside className="workspace-sidebar" aria-label="Workspace and canvases">
          <label className="workspace-name-field">
            <span className="eyebrow">WORKSPACE</span>
            <input
              aria-label="Workspace name"
              value={workspace.name}
              onChange={(event) =>
                setWorkspace((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </label>

          <div className="canvas-list-heading">
            <span>CANVASES</span>
            <button
              className="add-canvas-button"
              type="button"
              onClick={addCanvas}
              aria-label="Create a new canvas"
              title="Create a new canvas"
            >
              +
            </button>
          </div>
          <nav className="canvas-list" aria-label="Workspace canvases">
            {workspace.canvases.map((canvas) => (
              <button
                className={`canvas-list-item${canvas.id === activeCanvasId ? " canvas-list-item--active" : ""}`}
                type="button"
                key={canvas.id}
                onClick={() => selectCanvas(canvas.id)}
                aria-current={canvas.id === activeCanvasId ? "page" : undefined}
              >
                <span className="canvas-list-icon" aria-hidden="true">▱</span>
                <span className="canvas-list-name">{canvas.name || "Untitled canvas"}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-tools-heading">TOOLS</div>
          <button
            className="tool-button add-tool"
            type="button"
            onClick={addClass}
            title="Add a class to this canvas"
          >
            <span>＋</span>
            <small>Class</small>
          </button>
          <div className="toolbar-note">
            Drag nodes to arrange them. Connect the handles to show a relationship.
          </div>
        </aside>

        <section className="canvas-area" aria-label="Diagram canvas">
          <div className="canvas-heading">
            <div>
              <p className="eyebrow">DIAGRAM CANVAS</p>
              <h1>
                <input
                  className="canvas-name-input"
                  aria-label="Canvas name"
                  value={activeCanvas.name}
                  onChange={(event) => renameCanvas(event.target.value)}
                />
              </h1>
            </div>
            <span className="canvas-hint">
              Changes are held in this browser session
            </span>
            <div className="canvas-actions">
              {selectedEdgeIds.length > 0 && (
                <button className="panel-action panel-action--danger" type="button" onClick={deleteSelectedEdges}>
                  Delete connection{selectedEdgeIds.length > 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
          <div className="flow-frame">
            <ClassNodeActionsContext.Provider value={{ updateClassData }}>
              <ReactFlow
                nodes={activeCanvas.nodes}
                edges={activeCanvas.edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onSelectionChange={onSelectionChange}
                deleteKeyCode={null}
                edgesFocusable
                elementsSelectable
                fitView
                fitViewOptions={{ padding: 0.25 }}
                defaultEdgeOptions={relationshipEdgeOptions}
                minZoom={0.25}
                maxZoom={1.8}
              >
                <Background color="#dfe4eb" gap={22} size={1} />
                <Controls position="bottom-left" />
                <MiniMap
                  position="bottom-right"
                  nodeColor="#97a7c1"
                  maskColor="rgb(247 248 250 / 65%)"
                />
              </ReactFlow>
            </ClassNodeActionsContext.Provider>
            <div className="canvas-legend">
              <span className="legend-line" /> Relationship
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function App() {
  return window.location.pathname === "/editor" ? (
    <EditorWorkspace />
  ) : (
    <LandingPage />
  );
}

export default App;
