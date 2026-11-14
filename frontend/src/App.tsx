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
  SelectionMode,
  applyNodeChanges,
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
import type { UMLBorderPoint } from "./components/ClassNodeActionsContext";
import LandingPage from "./components/LandingPage";
import RelationshipTypePopover from "./components/RelationshipTypePopover";
import UMLRelationshipEdge, {
  type UMLRelationshipFlowEdge,
} from "./components/UMLRelationshipEdge";
import WorkspaceCreationDialog from "./components/WorkspaceCreationDialog";
import type {
  UMLCanvas,
  UMLClass,
  UMLClassNodeData,
  UMLClassNodeFlowData,
  UMLRelationship,
  UMLRelationshipKind,
  UMLWorkspace,
} from "./diagram/types";

type DiagramNode = Node<UMLClassNodeFlowData, "class">;
type DiagramEdge = UMLRelationshipFlowEdge;
type PopupPosition = { left: number; top: number };
type RelationshipChooser =
  | { mode: "create"; connection: Connection; position: PopupPosition }
  | { mode: "edit"; relationshipId: string; position: PopupPosition }
  | null;
type DiagramClipboard = {
  classes: UMLClass[];
  relationships: UMLRelationship[];
};

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function getHandleIds(
  nodeId: string,
  relationships: UMLRelationship[],
  type: "source" | "target",
) {
  const matching = relationships.filter((relationship) =>
    type === "source"
      ? relationship.sourceId === nodeId
      : relationship.targetId === nodeId,
  );
  const ids = matching.map((relationship) =>
    type === "source"
      ? relationship.sourceHandle ?? "source-top"
      : relationship.targetHandle ?? "target-top",
  );
  return [...new Set(ids)];
}

function withRelationshipHandles(
  node: DiagramNode,
  relationships: UMLRelationship[],
): DiagramNode {
  return {
    ...node,
    data: {
      ...node.data,
      sourceHandleIds: getHandleIds(node.id, relationships, "source"),
      targetHandleIds: getHandleIds(node.id, relationships, "target"),
    },
  };
}

function toFlowNode(
  umlClass: UMLClass,
  relationships: UMLRelationship[] = [],
): DiagramNode {
  const { id, position, ...data } = umlClass;
  return withRelationshipHandles(
    { id, type: "class", position, data: { ...data, sourceHandleIds: [], targetHandleIds: [] } },
    relationships,
  );
}

function createHandleId(type: "source" | "target", side: string, offset: number) {
  return `${type}-${side}-${offset}`;
}

function cloneUMLClass(umlClass: UMLClass): UMLClass {
  return {
    ...umlClass,
    attributes: umlClass.attributes.map((attribute) => ({ ...attribute })),
    methods: umlClass.methods.map((method) => ({ ...method })),
  };
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
  const [nodes, setNodes] = useState<DiagramNode[]>(() =>
    activeCanvas.classes.map((umlClass) =>
      toFlowNode(umlClass, activeCanvas.relationships),
    ),
  );
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [pendingSource, setPendingSource] = useState<{
    nodeId: string;
    handleId: string;
  } | null>(null);
  const [relationshipChooser, setRelationshipChooser] =
    useState<RelationshipChooser>(null);
  const [clipboard, setClipboard] = useState<DiagramClipboard | null>(null);
  const flowFrameRef = useRef<HTMLDivElement>(null);
  const pasteCountRef = useRef(0);

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
      setNodes((current) =>
        current.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...update(node.data) } }
            : node,
        ),
      );
    },
    [updateActiveCanvas],
  );

  useEffect(() => {
    setNodes(
      activeCanvas.classes.map((umlClass) =>
        toFlowNode(umlClass, activeCanvas.relationships),
      ),
    );
  }, [activeCanvasId]);

  useEffect(() => {
    if (!relationshipChooser) return;
    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(".relationship-popover")
      ) {
        return;
      }
      setRelationshipChooser(null);
      setPendingSource(null);
    };
    document.addEventListener("pointerdown", handleOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handleOutsidePointerDown);
  }, [relationshipChooser]);

  const onNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) => {
      setNodes((current) => applyNodeChanges(changes, current));
    },
    [],
  );

  const onNodeDragStop = useCallback(
    (_event: MouseEvent | TouchEvent, node: DiagramNode) => {
      updateActiveCanvas((canvas) => ({
        ...canvas,
        classes: canvas.classes.map((umlClass) =>
          umlClass.id === node.id
            ? { ...umlClass, position: node.position }
            : umlClass,
        ),
      }));
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
      const relationships = activeCanvas.relationships.filter(
        (relationship) => !removedIds.has(relationship.id),
      );
      updateActiveCanvas((canvas) => ({
        ...canvas,
        relationships,
      }));
      setNodes((current) =>
        current.map((node) => withRelationshipHandles(node, relationships)),
      );
    },
    [updateActiveCanvas],
  );

  const popupPositionAt = useCallback((clientX: number, clientY: number) => {
    const frame = flowFrameRef.current;
    if (!frame) return { left: 12, top: 12 };
    const bounds = frame.getBoundingClientRect();
    return {
      left: Math.max(12, Math.min(clientX - bounds.left, bounds.width - 342)),
      top: Math.max(12, Math.min(clientY - bounds.top, bounds.height - 175)),
    };
  }, []);

  const onBorderClick = useCallback(
    (nodeId: string, point: UMLBorderPoint, clientX: number, clientY: number) => {
      flowFrameRef.current?.focus({ preventScroll: true });
      const position = popupPositionAt(clientX, clientY);
      if (!pendingSource) {
        setPendingSource({
          nodeId,
          handleId: createHandleId("source", point.side, point.offset),
        });
        return;
      }

      setRelationshipChooser({
        mode: "create",
        connection: {
          source: pendingSource.nodeId,
          sourceHandle: pendingSource.handleId,
          target: nodeId,
          targetHandle: createHandleId("target", point.side, point.offset),
        },
        position,
      });
      setPendingSource(null);
    },
    [pendingSource, popupPositionAt],
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

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: DiagramEdge) => {
      setSelectedNodeIds([]);
      setSelectedEdgeIds([edge.id]);
      setRelationshipChooser({
        mode: "edit",
        relationshipId: edge.id,
        position: popupPositionAt(event.clientX, event.clientY),
      });
    },
    [popupPositionAt],
  );

  const selectAll = useCallback(() => {
    setSelectedNodeIds(activeCanvas.classes.map((umlClass) => umlClass.id));
    setNodes((current) => current.map((node) => ({ ...node, selected: true })));
    setSelectedEdgeIds(
      activeCanvas.relationships.map((relationship) => relationship.id),
    );
  }, [activeCanvas.classes, activeCanvas.relationships]);

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
    setNodes((current) => current.filter((node) => !nodeIds.has(node.id)));
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [selectedEdgeIds, selectedNodeIds, updateActiveCanvas]);

  const deleteSelectedConnections = useCallback(() => {
    if (selectedEdgeIds.length === 0) return;
    const relationshipIds = new Set(selectedEdgeIds);
    const relationships = activeCanvas.relationships.filter(
      (relationship) => !relationshipIds.has(relationship.id),
    );
    updateActiveCanvas((canvas) => ({
      ...canvas,
      relationships,
    }));
    setNodes((current) =>
      current.map((node) => withRelationshipHandles(node, relationships)),
    );
    setSelectedEdgeIds([]);
  }, [activeCanvas.relationships, selectedEdgeIds, updateActiveCanvas]);

  const copySelected = useCallback(() => {
    const selectedIds = new Set(selectedNodeIds);
    const classes = activeCanvas.classes
      .filter((umlClass) => selectedIds.has(umlClass.id))
      .map(cloneUMLClass);
    if (classes.length === 0) return;
    const relationships = activeCanvas.relationships
      .filter(
        (relationship) =>
          selectedIds.has(relationship.sourceId) &&
          selectedIds.has(relationship.targetId),
      )
      .map((relationship) => ({ ...relationship }));
    setClipboard({ classes, relationships });
    pasteCountRef.current = 0;
  }, [activeCanvas.classes, activeCanvas.relationships, selectedNodeIds]);

  const pasteCopied = useCallback(() => {
    if (!clipboard || clipboard.classes.length === 0) return;
    pasteCountRef.current += 1;
    const offset = pasteCountRef.current * 36;
    const idMap = new Map(
      clipboard.classes.map((umlClass) => [umlClass.id, createId("class")]),
    );
    const classes = clipboard.classes.map((umlClass) => ({
      ...umlClass,
      id: idMap.get(umlClass.id)!,
      position: {
        x: umlClass.position.x + offset,
        y: umlClass.position.y + offset,
      },
      attributes: umlClass.attributes.map((attribute) => ({
        ...attribute,
        id: createId("attribute"),
      })),
      methods: umlClass.methods.map((method) => ({
        ...method,
        id: createId("method"),
      })),
    }));
    const relationships = clipboard.relationships
      .filter(
        (relationship) =>
          idMap.has(relationship.sourceId) && idMap.has(relationship.targetId),
      )
      .map((relationship) => ({
        ...relationship,
        id: createId("relationship"),
        sourceId: idMap.get(relationship.sourceId)!,
        targetId: idMap.get(relationship.targetId)!,
      }));
    const pastedNodeIds = classes.map((umlClass) => umlClass.id);
    const pastedRelationshipIds = relationships.map(
      (relationship) => relationship.id,
    );

    updateActiveCanvas((canvas) => ({
      ...canvas,
      classes: [...canvas.classes, ...classes],
      relationships: [...canvas.relationships, ...relationships],
    }));
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      ...classes.map((umlClass) => ({
        ...toFlowNode(umlClass, relationships),
        selected: true,
      })),
    ]);
    setSelectedNodeIds(pastedNodeIds);
    setSelectedEdgeIds(pastedRelationshipIds);
  }, [clipboard, updateActiveCanvas]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.key === "Escape" && relationshipChooser?.mode === "create") {
        event.preventDefault();
        setRelationshipChooser(null);
        setPendingSource(null);
        return;
      }
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
        setNodes((current) =>
          current.map((node) => ({ ...node, selected: true })),
        );
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
    const position = {
      x: 160 + (activeCanvas.classes.length % 4) * 55,
      y: 120 + (activeCanvas.classes.length % 4) * 50,
    };
    updateActiveCanvas((canvas) => ({
      ...canvas,
      classes: [
        ...canvas.classes,
        {
          id,
          position,
          name: "NewClass",
          attributes: [],
          methods: [],
        },
      ],
    }));
    setNodes((current) => [
      ...current.map((node) => ({ ...node, selected: false })),
      {
        id,
        type: "class",
        position,
        data: {
          name: "NewClass",
          attributes: [],
          methods: [],
          sourceHandleIds: [],
          targetHandleIds: [],
        },
        selected: true,
      },
    ]);
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
    setNodes([]);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    setPendingSource(null);
    setRelationshipChooser(null);
  };

  const selectCanvas = (canvasId: string) => {
    setActiveCanvasId(canvasId);
    const canvas = workspace.canvases.find((item) => item.id === canvasId);
    if (canvas) {
      setNodes(
        canvas.classes.map((umlClass) =>
          toFlowNode(umlClass, canvas.relationships),
        ),
      );
    }
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    setPendingSource(null);
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
    if (canvas.id === activeCanvasId) {
      setActiveCanvasId(remaining[0].id);
      setNodes(
        remaining[0].classes.map((umlClass) =>
          toFlowNode(umlClass, remaining[0].relationships),
        ),
      );
    }
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
    setPendingSource(null);
    setRelationshipChooser(null);
  };

  const openRelationshipEditor = () => {
    if (selectedEdgeIds.length !== 1) return;
    const bounds = flowFrameRef.current?.getBoundingClientRect();
    setRelationshipChooser({
      mode: "edit",
      relationshipId: selectedEdgeIds[0],
      position: bounds
        ? { left: Math.max(12, bounds.width / 2 - 165), top: 18 }
        : { left: 12, top: 12 },
    });
  };

  const deleteRelationship = (relationshipId: string) => {
    const relationships = activeCanvas.relationships.filter(
      (relationship) => relationship.id !== relationshipId,
    );
    updateActiveCanvas((canvas) => ({ ...canvas, relationships }));
    setNodes((current) =>
      current.map((node) => withRelationshipHandles(node, relationships)),
    );
    setSelectedEdgeIds((current) =>
      current.filter((id) => id !== relationshipId),
    );
    setRelationshipChooser(null);
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
      const relationships = [...activeCanvas.relationships, relationship];
      setNodes((current) =>
        current.map((node) => withRelationshipHandles(node, relationships)),
      );
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
    setPendingSource(null);
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
          <ClassNodeActionsContext.Provider value={{ updateClassData, onBorderClick }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onNodeDragStop={onNodeDragStop}
              onEdgesChange={onEdgesChange}
              onEdgeClick={onEdgeClick}
              onPaneClick={() => {
                setPendingSource(null);
                setRelationshipChooser(null);
              }}
              onSelectionChange={onSelectionChange}
              connectionLineType={ConnectionLineType.Bezier}
              defaultEdgeOptions={{ type: "umlRelationship" }}
              deleteKeyCode={null}
              selectionOnDrag
              selectionMode={SelectionMode.Full}
              panOnDrag={[1]}
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
              key={
                relationshipChooser.mode === "create"
                  ? `create-${relationshipChooser.connection.source}-${relationshipChooser.connection.target}`
                  : `edit-${relationshipChooser.relationshipId}`
              }
              title={
                relationshipChooser.mode === "create"
                  ? "Choose relationship type"
                  : "Manage connection"
              }
              style={{
                left: relationshipChooser.position.left,
                top: relationshipChooser.position.top,
                transform: "none",
              }}
              initialKind={
                relationshipChooser.mode === "edit"
                  ? activeCanvas.relationships.find(
                      (relationship) =>
                        relationship.id === relationshipChooser.relationshipId,
                    )?.kind
                  : undefined
              }
              onSelect={chooseRelationshipKind}
              onCancel={() => {
                setRelationshipChooser(null);
                setPendingSource(null);
              }}
              onDelete={
                relationshipChooser.mode === "edit"
                  ? () => deleteRelationship(relationshipChooser.relationshipId)
                  : undefined
              }
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
