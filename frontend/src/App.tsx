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
import LandingPage from "./components/LandingPage";
import type {
  UMLAttribute,
  UMLClass,
  UMLClassNodeData,
  UMLMethod,
} from "./diagram/types";

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
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classDraft, setClassDraft] = useState<UMLClassNodeData | null>(null);

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
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: DiagramNode[]; edges: Edge[] }) => {
      setSelectedClassId(
        selectedNodes.length === 1 ? selectedNodes[0].id : null,
      );
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

  const openClassEditor = () => {
    if (!selectedClassId) return;
    const selectedClass = activeCanvas.nodes.find(
      (node) => node.id === selectedClassId,
    );
    if (!selectedClass) return;

    setEditingClassId(selectedClass.id);
    setClassDraft({
      ...selectedClass.data,
      attributes: selectedClass.data.attributes.map((attribute) => ({ ...attribute })),
      methods: selectedClass.data.methods.map((method) => ({ ...method })),
    });
  };

  const closeClassEditor = () => {
    setEditingClassId(null);
    setClassDraft(null);
  };

  const saveClassEditor = () => {
    if (!editingClassId || !classDraft) return;
    updateActiveCanvas((canvas) => ({
      ...canvas,
      nodes: canvas.nodes.map((node) =>
        node.id === editingClassId ? { ...node, data: classDraft } : node,
      ),
    }));
    closeClassEditor();
  };

  const updateAttribute = (id: string, changes: Partial<UMLAttribute>) => {
    setClassDraft((current) =>
      current
        ? {
            ...current,
            attributes: current.attributes.map((attribute) =>
              attribute.id === id ? { ...attribute, ...changes } : attribute,
            ),
          }
        : current,
    );
  };

  const updateMethod = (id: string, changes: Partial<UMLMethod>) => {
    setClassDraft((current) =>
      current
        ? {
            ...current,
            methods: current.methods.map((method) =>
              method.id === id ? { ...method, ...changes } : method,
            ),
          }
        : current,
    );
  };

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
    setSelectedClassId(null);
    setSelectedEdgeIds([]);
    closeClassEditor();
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
    setSelectedClassId(null);
    setSelectedEdgeIds([]);
    closeClassEditor();
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
              {selectedClassId && (
                <button className="panel-action" type="button" onClick={openClassEditor}>
                  Edit Class
                </button>
              )}
              {selectedEdgeIds.length > 0 && (
                <button className="panel-action panel-action--danger" type="button" onClick={deleteSelectedEdges}>
                  Delete connection{selectedEdgeIds.length > 1 ? "s" : ""}
                </button>
              )}
            </div>
          </div>
          <div className="flow-frame">
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
            <div className="canvas-legend">
              <span className="legend-line" /> Relationship
            </div>
          </div>
        </section>

        {classDraft && (
          <aside className="class-editor" aria-label="Edit class details">
            <div className="class-editor__header">
              <div>
                <p className="eyebrow">CLASS DETAILS</p>
                <h2>Edit Class</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeClassEditor} aria-label="Close class editor">
                ×
              </button>
            </div>

            <label className="editor-field">
              <span>Class name</span>
              <input
                autoFocus
                value={classDraft.name}
                onChange={(event) =>
                  setClassDraft({ ...classDraft, name: event.target.value })
                }
              />
            </label>

            <section className="editor-list" aria-labelledby="attributes-heading">
              <div className="editor-list__heading">
                <h3 id="attributes-heading">Attributes</h3>
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    setClassDraft({
                      ...classDraft,
                      attributes: [
                        ...classDraft.attributes,
                        { id: createId("attribute"), name: "", type: "string" },
                      ],
                    })
                  }
                >
                  + Add
                </button>
              </div>
              {classDraft.attributes.map((attribute, index) => (
                <div className="editor-row" key={attribute.id}>
                  <input
                    aria-label={`Attribute ${index + 1} name`}
                    placeholder="Name"
                    value={attribute.name}
                    onChange={(event) => updateAttribute(attribute.id, { name: event.target.value })}
                  />
                  <input
                    aria-label={`Attribute ${index + 1} type`}
                    placeholder="Type"
                    value={attribute.type}
                    onChange={(event) => updateAttribute(attribute.id, { type: event.target.value })}
                  />
                  <button
                    className="remove-button"
                    type="button"
                    aria-label={`Remove attribute ${index + 1}`}
                    onClick={() =>
                      setClassDraft({
                        ...classDraft,
                        attributes: classDraft.attributes.filter((item) => item.id !== attribute.id),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </section>

            <section className="editor-list" aria-labelledby="methods-heading">
              <div className="editor-list__heading">
                <h3 id="methods-heading">Methods</h3>
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    setClassDraft({
                      ...classDraft,
                      methods: [
                        ...classDraft.methods,
                        { id: createId("method"), name: "", returnType: "void" },
                      ],
                    })
                  }
                >
                  + Add
                </button>
              </div>
              {classDraft.methods.map((method, index) => (
                <div className="editor-row" key={method.id}>
                  <input
                    aria-label={`Method ${index + 1} name`}
                    placeholder="Name"
                    value={method.name}
                    onChange={(event) => updateMethod(method.id, { name: event.target.value })}
                  />
                  <input
                    aria-label={`Method ${index + 1} return type`}
                    placeholder="Returns"
                    value={method.returnType}
                    onChange={(event) => updateMethod(method.id, { returnType: event.target.value })}
                  />
                  <button
                    className="remove-button"
                    type="button"
                    aria-label={`Remove method ${index + 1}`}
                    onClick={() =>
                      setClassDraft({
                        ...classDraft,
                        methods: classDraft.methods.filter((item) => item.id !== method.id),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
            </section>

            <div className="class-editor__footer">
              <button className="panel-action panel-action--quiet" type="button" onClick={closeClassEditor}>
                Cancel
              </button>
              <button className="panel-action" type="button" onClick={saveClassEditor}>
                Save changes
              </button>
            </div>
          </aside>
        )}
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
