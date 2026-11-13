import { useRef, useState } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type {
  UMLAttribute,
  UMLClassNodeData,
  UMLMethod,
} from "../diagram/types";
import { useClassNodeActions } from "./ClassNodeActionsContext";
import "./ClassNode.css";

type ClassFlowNode = Node<UMLClassNodeData, "class">;
type EditingMember =
  | { kind: "attribute"; id: string; isNew?: boolean }
  | { kind: "method"; id: string; isNew?: boolean };
type MemberDraft = { name: string; type: string };

const handleSides = [
  {
    id: "top",
    position: Position.Top,
    sourceStyle: { left: "36%" },
    targetStyle: { left: "64%" },
  },
  {
    id: "right",
    position: Position.Right,
    sourceStyle: { top: "36%" },
    targetStyle: { top: "64%" },
  },
  {
    id: "bottom",
    position: Position.Bottom,
    sourceStyle: { left: "36%" },
    targetStyle: { left: "64%" },
  },
  {
    id: "left",
    position: Position.Left,
    sourceStyle: { top: "36%" },
    targetStyle: { top: "64%" },
  },
];

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export default function ClassNode({ id, data }: NodeProps<ClassFlowNode>) {
  const { updateClassData } = useClassNodeActions();
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(data.name);
  const [editingMember, setEditingMember] = useState<EditingMember | null>(
    null,
  );
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const cancelNameBlur = useRef(false);
  const cancelMemberBlur = useRef(false);

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
    <div className="class-node">
      {handleSides.map((side) => (
        <Handle
          key={`source-${side.id}`}
          id={`source-${side.id}`}
          className="class-node__handle class-node__handle--source"
          type="source"
          position={side.position}
          style={side.sourceStyle}
        />
      ))}

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
        <div
          className="class-node__header nodrag"
          title="Double-click to edit class name"
          onClick={beginNameEdit}
        >
          {data.name || "Untitled class"}
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

      {handleSides.map((side) => (
        <Handle
          key={`target-${side.id}`}
          id={`target-${side.id}`}
          className="class-node__handle class-node__handle--target"
          type="target"
          position={side.position}
          style={side.targetStyle}
        />
      ))}
    </div>
  );
}
