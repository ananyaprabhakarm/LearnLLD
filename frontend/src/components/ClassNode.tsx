import { useEffect, useRef, useState } from "react";
import {
  Handle,
  Position,
  useUpdateNodeInternals,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type {
  UMLAttribute,
  UMLClassNodeFlowData,
  UMLMethod,
} from "../diagram/types";
import { useClassNodeActions, type UMLBorderPoint } from "./ClassNodeActionsContext";
import "./ClassNode.css";

type ClassFlowNode = Node<UMLClassNodeFlowData, "class">;
type EditingMember =
  | { kind: "attribute"; id: string; isNew?: boolean }
  | { kind: "method"; id: string; isNew?: boolean };
type MemberDraft = { name: string; type: string };

const borderPositions = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left,
} as const;

function getHandleLayout(handleId: string) {
  const match = /^(source|target)-(top|right|bottom|left)(?:-(\d+))?$/.exec(
    handleId,
  );
  if (!match) return null;
  const [, type, side, rawOffset] = match;
  const offset = rawOffset
    ? Number(rawOffset)
    : type === "source"
      ? 36
      : 64;
  return {
    type: type as "source" | "target",
    side: side as keyof typeof borderPositions,
    offset,
    position: borderPositions[side as keyof typeof borderPositions],
    style:
      side === "top" || side === "bottom"
        ? { left: `${offset}%` }
        : { top: `${offset}%` },
  };
}

function getBorderPoint(rect: DOMRect, clientX: number, clientY: number) {
  const localX = clientX - rect.left;
  const localY = clientY - rect.top;
  const distances = [
    { side: "top" as const, distance: localY, value: localX / rect.width },
    { side: "right" as const, distance: rect.width - localX, value: localY / rect.height },
    { side: "bottom" as const, distance: rect.height - localY, value: localX / rect.width },
    { side: "left" as const, distance: localX, value: localY / rect.height },
  ];
  const nearest = distances.reduce((current, candidate) =>
    candidate.distance < current.distance ? candidate : current,
  );
  if (nearest.distance > 14) return null;
  const offset = Math.max(5, Math.min(95, Math.round(nearest.value * 100)));
  return { side: nearest.side, offset } satisfies UMLBorderPoint;
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "button, input, textarea, select, .class-node__name, [contenteditable='true']",
      ),
    )
  );
}

function borderPointStyle({ side, offset }: UMLBorderPoint) {
  if (side === "top") return { left: `${offset}%`, top: "0%" };
  if (side === "right") return { left: "100%", top: `${offset}%` };
  if (side === "bottom") return { left: `${offset}%`, top: "100%" };
  return { left: "0%", top: `${offset}%` };
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export default function ClassNode({ id, data }: NodeProps<ClassFlowNode>) {
  const { updateClassData, onBorderClick } = useClassNodeActions();
  const updateNodeInternals = useUpdateNodeInternals();
  const [hoveredBorderPoint, setHoveredBorderPoint] =
    useState<UMLBorderPoint | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(data.name);
  const [editingMember, setEditingMember] = useState<EditingMember | null>(
    null,
  );
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const cancelNameBlur = useRef(false);
  const cancelMemberBlur = useRef(false);

  useEffect(() => {
    updateNodeInternals(id);
  }, [data.sourceHandleIds, data.targetHandleIds, id, updateNodeInternals]);

  const beginNameEdit = () => {
    setNameDraft(data.name);
    setEditingName(true);
  };

  const saveName = () => {
    updateClassData(id, (current) => ({ ...current, name: nameDraft }));
    setEditingName(false);
  };

  const beginMemberEdit = (member: EditingMember, value: MemberDraft) => {
    setEditingMember(member);
    setMemberDraft(value);
  };

  const saveMember = () => {
    if (!editingMember || !memberDraft) return;

    updateClassData(id, (current) => {
      if (editingMember.kind === "attribute") {
        return {
          ...current,
          attributes: current.attributes.map((attribute) =>
            attribute.id === editingMember.id
              ? { ...attribute, name: memberDraft.name, type: memberDraft.type }
              : attribute,
          ),
        };
      }

      return {
        ...current,
        methods: current.methods.map((method) =>
          method.id === editingMember.id
            ? {
                ...method,
                name: memberDraft.name,
                returnType: memberDraft.type,
              }
            : method,
        ),
      };
    });
    setEditingMember(null);
    setMemberDraft(null);
  };

  const cancelMemberEdit = () => {
    const memberToCancel = editingMember;
    cancelMemberBlur.current = true;
    setEditingMember(null);
    setMemberDraft(null);
    if (memberToCancel?.isNew) {
      updateClassData(id, (current) =>
        memberToCancel.kind === "attribute"
          ? {
              ...current,
              attributes: current.attributes.filter(
                (attribute) => attribute.id !== memberToCancel.id,
              ),
            }
          : {
              ...current,
              methods: current.methods.filter(
                (method) => method.id !== memberToCancel.id,
              ),
            },
      );
    }
  };

  const addAttribute = () => {
    const attribute: UMLAttribute = {
      id: createId("attribute"),
      name: "",
      type: "string",
    };
    updateClassData(id, (current) => ({
      ...current,
      attributes: [...current.attributes, attribute],
    }));
    beginMemberEdit(
      { kind: "attribute", id: attribute.id, isNew: true },
      { name: attribute.name, type: attribute.type },
    );
  };

  const addMethod = () => {
    const method: UMLMethod = {
      id: createId("method"),
      name: "",
      returnType: "void",
    };
    updateClassData(id, (current) => ({
      ...current,
      methods: [...current.methods, method],
    }));
    beginMemberEdit(
      { kind: "method", id: method.id, isNew: true },
      { name: method.name, type: method.returnType },
    );
  };

  const deleteAttribute = (attributeId: string) => {
    updateClassData(id, (current) => ({
      ...current,
      attributes: current.attributes.filter(
        (attribute) => attribute.id !== attributeId,
      ),
    }));
    if (
      editingMember?.kind === "attribute" &&
      editingMember.id === attributeId
    ) {
      setEditingMember(null);
      setMemberDraft(null);
    }
  };

  const deleteMethod = (methodId: string) => {
    updateClassData(id, (current) => ({
      ...current,
      methods: current.methods.filter((method) => method.id !== methodId),
    }));
    if (editingMember?.kind === "method" && editingMember.id === methodId) {
      setEditingMember(null);
      setMemberDraft(null);
    }
  };

  const handleNameKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelNameBlur.current = true;
      setNameDraft(data.name);
      setEditingName(false);
      event.currentTarget.blur();
    }
  };

  const handleMemberKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelMemberEdit();
      event.currentTarget.blur();
    }
  };

  const handleMemberBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (
      event.relatedTarget instanceof globalThis.Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }
    if (cancelMemberBlur.current) {
      cancelMemberBlur.current = false;
      return;
    }
    saveMember();
  };

  return (
    <div
      className="class-node"
      onPointerMove={(event) => {
        const point = getBorderPoint(
          event.currentTarget.getBoundingClientRect(),
          event.clientX,
          event.clientY,
        );
        setHoveredBorderPoint(point);
      }}
      onPointerDown={(event) => {
        if (isInteractiveTarget(event.target)) return;
        const point = getBorderPoint(
          event.currentTarget.getBoundingClientRect(),
          event.clientX,
          event.clientY,
        );
        if (!point) return;
        event.preventDefault();
        event.stopPropagation();
        onBorderClick(id, point, event.clientX, event.clientY);
      }}
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) return;
        const point = getBorderPoint(
          event.currentTarget.getBoundingClientRect(),
          event.clientX,
          event.clientY,
        );
        if (point) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onPointerLeave={() => setHoveredBorderPoint(null)}
    >
      {[...data.sourceHandleIds, ...data.targetHandleIds].map((handleId) => {
        const layout = getHandleLayout(handleId);
        if (!layout) return null;
        return (
          <Handle
            key={handleId}
            id={handleId}
            className="class-node__handle"
            type={layout.type}
            position={layout.position}
            style={layout.style}
          />
        );
      })}

      {hoveredBorderPoint && (
        <span
          className="class-node__border-indicator"
          style={borderPointStyle(hoveredBorderPoint)}
          aria-hidden="true"
        />
      )}

      {editingName ? (
        <input
          className="class-node__header class-node__header-input nodrag"
          aria-label="Class name"
          autoFocus
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          onKeyDown={handleNameKeyDown}
          onBlur={() => {
            if (cancelNameBlur.current) {
              cancelNameBlur.current = false;
              return;
            }
            saveName();
          }}
        />
      ) : (
        <div className="class-node__header">
          <span
            className="class-node__name nodrag"
            title="Click to edit class name"
            onClick={beginNameEdit}
          >
            {data.name || "Untitled class"}
          </span>
        </div>
      )}

      <section className="class-node__section" aria-label="Attributes">
        {data.attributes.map((attribute) =>
          editingMember?.kind === "attribute" &&
          editingMember.id === attribute.id &&
          memberDraft ? (
            <div
              className="class-node__member class-node__member--editing nodrag"
              key={attribute.id}
              onBlur={handleMemberBlur}
            >
              <input
                className="class-node__member-name nodrag"
                aria-label="Attribute name"
                autoFocus
                placeholder="name"
                value={memberDraft.name}
                onChange={(event) =>
                  setMemberDraft({ ...memberDraft, name: event.target.value })
                }
                onKeyDown={handleMemberKeyDown}
              />
              <span>:</span>
              <input
                className="class-node__member-type nodrag"
                aria-label="Attribute type"
                placeholder="type"
                value={memberDraft.type}
                onChange={(event) =>
                  setMemberDraft({ ...memberDraft, type: event.target.value })
                }
                onKeyDown={handleMemberKeyDown}
              />
              <button
                type="button"
                className="class-node__delete nodrag"
                aria-label={`Delete attribute ${attribute.name || "new attribute"}`}
                title="Delete attribute"
                onClick={() => deleteAttribute(attribute.id)}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="class-node__member" key={attribute.id}>
              <button
                type="button"
                className="class-node__member-label nodrag"
                onClick={() =>
                  beginMemberEdit(
                    { kind: "attribute", id: attribute.id },
                    { name: attribute.name, type: attribute.type },
                  )
                }
                aria-label={`Edit attribute ${attribute.name}`}
              >
                − {attribute.name}: {attribute.type}
              </button>
              <button
                type="button"
                className="class-node__delete nodrag"
                aria-label={`Delete attribute ${attribute.name}`}
                title="Delete attribute"
                onClick={() => deleteAttribute(attribute.id)}
              >
                ×
              </button>
            </div>
          ),
        )}
        <button
          type="button"
          className="class-node__add nodrag"
          onClick={addAttribute}
        >
          + Add attribute
        </button>
      </section>

      <section
        className="class-node__section class-node__section--methods"
        aria-label="Methods"
      >
        {data.methods.map((method) =>
          editingMember?.kind === "method" &&
          editingMember.id === method.id &&
          memberDraft ? (
            <div
              className="class-node__member class-node__member--editing nodrag"
              key={method.id}
              onBlur={handleMemberBlur}
            >
              <input
                className="class-node__member-name nodrag"
                aria-label="Method name"
                autoFocus
                placeholder="name"
                value={memberDraft.name}
                onChange={(event) =>
                  setMemberDraft({ ...memberDraft, name: event.target.value })
                }
                onKeyDown={handleMemberKeyDown}
              />
              <span>():</span>
              <input
                className="class-node__member-type nodrag"
                aria-label="Method return type"
                placeholder="return type"
                value={memberDraft.type}
                onChange={(event) =>
                  setMemberDraft({ ...memberDraft, type: event.target.value })
                }
                onKeyDown={handleMemberKeyDown}
              />
              <button
                type="button"
                className="class-node__delete nodrag"
                aria-label={`Delete method ${method.name || "new method"}`}
                title="Delete method"
                onClick={() => deleteMethod(method.id)}
              >
                ×
              </button>
            </div>
          ) : (
            <div className="class-node__member" key={method.id}>
              <button
                type="button"
                className="class-node__member-label nodrag"
                onClick={() =>
                  beginMemberEdit(
                    { kind: "method", id: method.id },
                    { name: method.name, type: method.returnType },
                  )
                }
                aria-label={`Edit method ${method.name}`}
              >
                + {method.name}(): {method.returnType}
              </button>
              <button
                type="button"
                className="class-node__delete nodrag"
                aria-label={`Delete method ${method.name}`}
                title="Delete method"
                onClick={() => deleteMethod(method.id)}
              >
                ×
              </button>
            </div>
          ),
        )}
        <button
          type="button"
          className="class-node__add nodrag"
          onClick={addMethod}
        >
          + Add method
        </button>
      </section>

    </div>
  );
}
