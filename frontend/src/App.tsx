import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Background,
  Controls,
  ConnectionLineType,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Brand from "./components/Brand";
import ClassNode from "./components/ClassNode";
import { ClassNodeActionsContext } from "./components/ClassNodeActionsContext";
import LandingPage from "./components/LandingPage";
import RelationshipTypePopover from "./components/RelationshipTypePopover";
import UMLRelationshipEdge, {
  type UMLRelationshipFlowEdge,
} from "./components/UMLRelationshipEdge";
import WorkspaceCreationDialog from "./components/WorkspaceCreationDialog";
import type {
  UMLCanvas,
  UMLClassNodeData,
  UMLRelationship,
  UMLRelationshipKind,
  UMLWorkspace,
} from "./diagram/types";

type DiagramNode = Node<UMLClassNodeData, "class">;
type DiagramEdge = UMLRelationshipFlowEdge;
type RelationshipChooser =
  | { mode: "create"; connection: Connection }
  | { mode: "edit"; relationshipId: string }
  | null;

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

const nodeTypes = { class: ClassNode };
const edgeTypes = { umlRelationship: UMLRelationshipEdge };

function FitViewButton() {
  const { fitView } = useReactFlow<DiagramNode, DiagramEdge>();
  return (
    <Panel position="top-right" className="fit-view-panel">
      <button
        className="fit-view-button"
        type="button"
        onClick={() => void fitView({ padding: 0.2 })}
      >
        Fit diagram
      </button>
    </Panel>
  );
}

type EditorWorkspaceProps = {
  workspace: UMLWorkspace;
  setWorkspace: Dispatch<SetStateAction<UMLWorkspace | null>>;
};

function EditorWorkspace({ workspace, setWorkspace }: EditorWorkspaceProps) {
  const [activeCanvasId, setActiveCanvasId] = useState(
    workspace.canvases[0].id,
  );
  const activeCanvas =
    workspace.canvases.find((canvas) => canvas.id === activeCanvasId) ??
    workspace.canvases[0];
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [draggingNodeIds, setDraggingNodeIds] = useState<string[]>([]);
  const [relationshipChooser, setRelationshipChooser] =
    useState<RelationshipChooser>(null);
  const flowFrameRef = useRef<HTMLDivElement>(null);

  const nodes: DiagramNode[] = activeCanvas.classes.map(
    ({ id, position, ...data }) => ({
      id,
      type: "class",
      position,
      data,
      selected: selectedNodeIds.includes(id),
      dragging: draggingNodeIds.includes(id),
    }),
  );
  const relationshipPairIndexes = new Map<string, number>();
  const edges: DiagramEdge[] = activeCanvas.relationships.map(
    (relationship) => {
      const key = [relationship.sourceId, relationship.targetId]
        .sort()
        .join("::");
      const pairIndex = relationshipPairIndexes.get(key) ?? 0;
      relationshipPairIndexes.set(key, pairIndex + 1);
      const direction =
        relationship.sourceId.localeCompare(relationship.targetId) <= 0
          ? 1
          : -1;
      return {
        id: relationship.id,
        type: "umlRelationship",
        source: relationship.sourceId,
        target: relationship.targetId,
        sourceHandle: relationship.sourceHandle,
        targetHandle: relationship.targetHandle,
        data: {
          kind: relationship.kind,
          curveOffset: direction * (18 + pairIndex * 24),
        },
        selected: selectedEdgeIds.includes(relationship.id),
      };
    },
  );

  const updateActiveCanvas = useCallback(
    (update: (canvas: UMLCanvas) => UMLCanvas) => {
      setWorkspace((current) => {
        if (!current) return current;
        return {
          ...current,
          canvases: current.canvases.map((canvas) =>
            canvas.id === activeCanvasId ? update(canvas) : canvas,
          ),
        };
      });
    },
    [activeCanvasId, setWorkspace],
  );

  const updateClassData = useCallback(
    (
      nodeId: string,
      update: (current: UMLClassNodeData) => UMLClassNodeData,
    ) => {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        classes: canvas.classes.map((umlClass) =>
          umlClass.id === nodeId
            ? { ...umlClass, ...update(umlClass) }
            : umlClass,
        ),
      }));
    },
    [updateActiveCanvas],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) => {
      const positions = new Map<string, { x: number; y: number }>();
      const dragStates = new Map<string, boolean>();
      for (const change of changes) {
        if (change.type === "position" && change.position) {
          positions.set(change.id, change.position);
        }
        if (change.type === "position" && change.dragging !== undefined) {
          dragStates.set(change.id, change.dragging);
        }
      }
      if (dragStates.size > 0) {
        setDraggingNodeIds((current) => {
          const next = new Set(current);
          for (const [id, isDragging] of dragStates) {
            if (isDragging) next.add(id);
            else next.delete(id);
          }
          return [...next];
        });
      }
      if (positions.size > 0) {
        updateActiveCanvas((canvas) => ({
          ...canvas,
          classes: canvas.classes.map((umlClass) => {
            const position = positions.get(umlClass.id);
            return position ? { ...umlClass, position } : umlClass;
          }),
        }));
      }
    },
    [updateActiveCanvas],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<DiagramEdge>[]) => {
      const removedIds = new Set(
        changes
          .filter((change) => change.type === "remove")
          .map((change) => change.id),
      );
      if (removedIds.size === 0) return;
      updateActiveCanvas((canvas) => ({
        ...canvas,
        relationships: canvas.relationships.filter(
          (relationship) => !removedIds.has(relationship.id),
        ),
      }));
    },
    [updateActiveCanvas],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        setRelationshipChooser({ mode: "create", connection });
      }
    },
    [],
  );

  const onSelectionChange = useCallback(
    ({
      nodes: selectedNodes,
      edges: selectedEdges,
    }: {
      nodes: DiagramNode[];
      edges: DiagramEdge[];
    }) => {
      setSelectedNodeIds(selectedNodes.map((node) => node.id));
      setSelectedEdgeIds(selectedEdges.map((edge) => edge.id));
    },
    [],
  );

  const deleteSelected = useCallback(() => {
    if (selectedNodeIds.length > 1) {
      const count = selectedNodeIds.length;
      if (!window.confirm(`Delete these ${count} classes and their relationships?`)) {
        return;
      }
    }
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;
    const nodeIds = new Set(selectedNodeIds);
    const relationshipIds = new Set(selectedEdgeIds);
    updateActiveCanvas((canvas) => ({
      ...canvas,
      classes: canvas.classes.filter((umlClass) => !nodeIds.has(umlClass.id)),
      relationships: canvas.relationships.filter(
        (relationship) =>
          !relationshipIds.has(relationship.id) &&
          !nodeIds.has(relationship.sourceId) &&
          !nodeIds.has(relationship.targetId),
      ),
    }));
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [selectedEdgeIds, selectedNodeIds, updateActiveCanvas]);

  const deleteSelectedConnections = useCallback(() => {
    if (selectedEdgeIds.length === 0) return;
    const relationshipIds = new Set(selectedEdgeIds);
    updateActiveCanvas((canvas) => ({
      ...canvas,
      relationships: canvas.relationships.filter(
        (relationship) => !relationshipIds.has(relationship.id),
      ),
    }));
    setSelectedEdgeIds([]);
  }, [selectedEdgeIds, updateActiveCanvas]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches("input, textarea, select, [contenteditable='true']") ||
          target.closest(".class-node__member--editing"))
      ) {
        return;
      }

      const canvasHasFocus =
        target instanceof globalThis.Node &&
        Boolean(flowFrameRef.current?.contains(target));
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "a" &&
        canvasHasFocus
      ) {
        event.preventDefault();
        setSelectedNodeIds(activeCanvas.classes.map((umlClass) => umlClass.id));
        setSelectedEdgeIds(
          activeCanvas.relationships.map((relationship) => relationship.id),
        );
        return;
      }

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        canvasHasFocus &&
        (selectedNodeIds.length > 0 || selectedEdgeIds.length > 0)
      ) {
        event.preventDefault();
        deleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeCanvas.classes,
    activeCanvas.relationships,
    deleteSelected,
    selectedEdgeIds.length,
    selectedNodeIds.length,
  ]);

  const addClass = () => {
    const id = createId("class");
    updateActiveCanvas((canvas) => ({
      ...canvas,
      classes: [
        ...canvas.classes,
        {
          id,
          position: {
            x: 160 + (canvas.classes.length % 4) * 55,
            y: 120 + (canvas.classes.length % 4) * 50,
          },
          name: "NewClass",
          attributes: [],
          methods: [],
        },
      ],
    }));
    setSelectedNodeIds([id]);
  };

  const addCanvas = () => {
    const existingNames = new Set(workspace.canvases.map((canvas) => canvas.name));
    let index = 1;
    while (existingNames.has(`Canvas ${index}`)) index += 1;
    const canvas: UMLCanvas = {
      id: createId("canvas"),
      name: `Canvas ${index}`,
      classes: [],
      relationships: [],
    };
    setWorkspace((current) => ({
      ...current!,
      canvases: [...current!.canvases, canvas],
    }));
    setActiveCanvasId(canvas.id);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    setRelationshipChooser(null);
  };

  const selectCanvas = (canvasId: string) => {
    setActiveCanvasId(canvasId);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    setRelationshipChooser(null);
  };

  const renameCanvas = (canvas: UMLCanvas) => {
    const nextName = window.prompt("Rename canvas", canvas.name);
    if (!nextName?.trim()) return;
    setWorkspace((current) => ({
      ...current!,
      canvases: current!.canvases.map((item) =>
        item.id === canvas.id ? { ...item, name: nextName.trim() } : item,
      ),
    }));
  };

  const deleteCanvas = (canvas: UMLCanvas) => {
    if (workspace.canvases.length <= 1) return;
    if (
      (canvas.classes.length > 0 || canvas.relationships.length > 0) &&
      !window.confirm(`Delete "${canvas.name}" and its diagram content?`)
    ) {
      return;
    }
    const remaining = workspace.canvases.filter((item) => item.id !== canvas.id);
    setWorkspace((current) => ({ ...current!, canvases: remaining }));
    if (canvas.id === activeCanvasId) setActiveCanvasId(remaining[0].id);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    setRelationshipChooser(null);
  };

  const openRelationshipEditor = () => {
    if (selectedEdgeIds.length !== 1) return;
    setRelationshipChooser({
      mode: "edit",
      relationshipId: selectedEdgeIds[0],
    });
  };

  const chooseRelationshipKind = (kind: UMLRelationshipKind) => {
    if (!relationshipChooser) return;
    if (relationshipChooser.mode === "create") {
      const { connection } = relationshipChooser;
      if (!connection.source || !connection.target) return;
      const relationship: UMLRelationship = {
        id: createId("relationship"),
        sourceId: connection.source,
        targetId: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        kind,
      };
      updateActiveCanvas((canvas) => ({
        ...canvas,
        relationships: [...canvas.relationships, relationship],
      }));
      setSelectedEdgeIds([relationship.id]);
      setSelectedNodeIds([]);
    } else {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        relationships: canvas.relationships.map((relationship) =>
          relationship.id === relationshipChooser.relationshipId
            ? { ...relationship, kind }
            : relationship,
        ),
      }));
    }
    setRelationshipChooser(null);
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="workspace-title">
          <span>WORKSPACE</span>
          <strong>{workspace.name}</strong>
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

      <div className="editor-layout">
        <div className="editor-toolbar" aria-label="Workspace tools">
          <div className="toolbar-caption">
            <span>CANVASES</span>
            <strong>{workspace.name}</strong>
          </div>
          <nav className="canvas-tabs" aria-label="Workspace canvases">
            {workspace.canvases.map((canvas) => (
              <div
                className={`canvas-tab${canvas.id === activeCanvasId ? " canvas-tab--active" : ""}`}
                key={canvas.id}
              >
                <button
                  className="canvas-tab__select"
                  type="button"
                  onClick={() => selectCanvas(canvas.id)}
                  onDoubleClick={() => renameCanvas(canvas)}
                  aria-current={canvas.id === activeCanvasId ? "page" : undefined}
                  title="Click to switch; double-click to rename"
                >
                  {canvas.name}
                </button>
                {workspace.canvases.length > 1 && (
                  <button
                    className="canvas-tab__delete"
                    type="button"
                    aria-label={`Delete ${canvas.name}`}
                    title="Delete canvas"
                    onClick={() => deleteCanvas(canvas)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </nav>
          <button
            className="toolbar-add-canvas"
            type="button"
            onClick={addCanvas}
            aria-label="Create a new canvas"
            title="Create a new canvas"
          >
            +
          </button>
          <span className="toolbar-divider" />
          <div className="toolbar-actions">
            <button className="toolbar-action toolbar-action--primary" type="button" onClick={addClass}>
              <span aria-hidden="true">＋</span> Add class
            </button>
            {(selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) && (
              <button className="toolbar-action toolbar-action--danger" type="button" onClick={deleteSelected}>
                Delete selected
              </button>
            )}
            {selectedEdgeIds.length > 0 && (
              <button
                className="toolbar-action toolbar-action--danger"
                type="button"
                onClick={deleteSelectedConnections}
              >
                Delete {selectedEdgeIds.length === 1 ? "connection" : `${selectedEdgeIds.length} connections`}
              </button>
            )}
            {selectedEdgeIds.length === 1 && (
              <button className="toolbar-action" type="button" onClick={openRelationshipEditor}>
                Change relationship type
              </button>
            )}
          </div>
        </div>

        <section
          className="flow-frame"
          ref={flowFrameRef}
          tabIndex={0}
          aria-label="Diagram canvas"
          onPointerDown={(event) => {
            if (
              event.target instanceof HTMLElement &&
              event.target.closest("input, textarea, select")
            ) {
              return;
            }
            flowFrameRef.current?.focus({ preventScroll: true });
          }}
        >
          <ClassNodeActionsContext.Provider value={{ updateClassData }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              connectionLineType={ConnectionLineType.Bezier}
              defaultEdgeOptions={{ type: "umlRelationship" }}
              deleteKeyCode={null}
              selectionOnDrag
              selectionKeyCode="Shift"
              multiSelectionKeyCode="Shift"
              edgesFocusable
              elementsSelectable
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.25}
              maxZoom={1.8}
            >
              <Background color="#dfe4eb" gap={22} size={1} />
              <Controls position="bottom-left" showFitView={false} />
              <MiniMap
                position="bottom-right"
                nodeColor="#97a7c1"
                maskColor="rgb(247 248 250 / 65%)"
              />
              <FitViewButton />
            </ReactFlow>
          </ClassNodeActionsContext.Provider>
          <div className="canvas-legend">
            <span className="legend-line" /> UML relationships
          </div>
          {relationshipChooser && (
            <RelationshipTypePopover
              title={
                relationshipChooser.mode === "create"
                  ? "Choose relationship type"
                  : "Change relationship type"
              }
              initialKind={
                relationshipChooser.mode === "edit"
                  ? activeCanvas.relationships.find(
                      (relationship) =>
                        relationship.id === relationshipChooser.relationshipId,
                    )?.kind
                  : undefined
              }
              onSelect={chooseRelationshipKind}
              onCancel={() => setRelationshipChooser(null)}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [workspace, setWorkspace] = useState<UMLWorkspace | null>(null);
  const [showWorkspaceDialog, setShowWorkspaceDialog] = useState(false);

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = window.location.pathname;
      setPath(nextPath);
      if (nextPath !== "/editor") setShowWorkspaceDialog(false);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigateToEditor = () => {
    window.history.pushState({}, "", "/editor");
    setPath("/editor");
  };

  const startDesigning = () => {
    if (workspace) {
      navigateToEditor();
      return;
    }
    setShowWorkspaceDialog(true);
  };

  const createWorkspace = (name: string) => {
    const newWorkspace: UMLWorkspace = {
      id: createId("workspace"),
      name,
      canvases: [
        {
          id: createId("canvas"),
          name: "Canvas 1",
          classes: [],
          relationships: [],
        },
      ],
    };
    setWorkspace(newWorkspace);
    setShowWorkspaceDialog(false);
    navigateToEditor();
  };

  const cancelWorkspaceCreation = () => {
    setShowWorkspaceDialog(false);
    if (path === "/editor") {
      window.history.pushState({}, "", "/");
      setPath("/");
    }
  };

  if (path === "/editor" && workspace) {
    return <EditorWorkspace workspace={workspace} setWorkspace={setWorkspace} />;
  }

  return (
    <>
      <LandingPage onStartDesigning={startDesigning} />
      {(showWorkspaceDialog || path === "/editor") && !workspace && (
        <WorkspaceCreationDialog
          onCreate={createWorkspace}
          onCancel={cancelWorkspaceCreation}
        />
      )}
    </>
  );
}

export default App;
