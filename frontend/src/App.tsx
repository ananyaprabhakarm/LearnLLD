import { useCallback, useEffect, useState } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Brand from "./components/Brand";
import ClassNode from "./components/ClassNode";
import type {
  UMLAttribute,
  UMLClass,
  UMLClassNodeData,
  UMLMethod,
} from "./diagram/types";

type DiagramNode = Node<UMLClassNodeData, "class">;

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

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

const nodeTypes = { class: ClassNode };

function App() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<DiagramNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classDraft, setClassDraft] = useState<UMLClassNodeData | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => {
      // Append directly so parallel connections between the same handles are kept.
      setEdges((current) => [
        ...current,
        {
          ...connection,
          id: createId("relationship"),
          label: "association",
          ...relationshipEdgeOptions,
        },
      ]);
    },
    [setEdges],
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
    setEdges((current) =>
      current.filter((edge) => !selectedEdgeIds.includes(edge.id)),
    );
    setSelectedEdgeIds([]);
  }, [selectedEdgeIds, setEdges]);

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
    const selectedClass = nodes.find((node) => node.id === selectedClassId);
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
    setNodes((current) =>
      current.map((node) =>
        node.id === editingClassId ? { ...node, data: classDraft } : node,
      ),
    );
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
    setNodes((current) => [
      ...current,
      {
        id,
        type: "class",
        position: {
          x: 220 + (current.length % 4) * 50,
          y: 130 + (current.length % 4) * 50,
        },
        data: { name: "New Class", attributes: [], methods: [] },
      },
    ]);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="workspace-title">
          <span>Workspace</span>
          <strong>Untitled diagram</strong>
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
        <aside className="toolbar" aria-label="Diagram tools">
          <button
            className="tool-button active"
            type="button"
            aria-label="Select and move nodes"
            title="Select and move nodes"
          >
            <span>↖</span>
          </button>
          <div className="tool-divider" />
          <button
            className="tool-button add-tool"
            type="button"
            onClick={addClass}
            title="Add a temporary class node"
          >
            <span>＋</span>
            <small>Class</small>
          </button>
          <div className="toolbar-note">
            Drag nodes to arrange them. Connect the handles to show a
            relationship.
          </div>
        </aside>

        <section className="canvas-area" aria-label="Diagram canvas">
          <div className="canvas-heading">
            <div>
              <p className="eyebrow">DIAGRAM CANVAS</p>
              <h1>Untitled diagram</h1>
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
              nodes={nodes}
              edges={edges}
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

export default App;
