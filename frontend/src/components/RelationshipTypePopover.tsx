import { useState } from "react";
import type { UMLRelationshipKind } from "../diagram/types";

export const relationshipOptions: {
  value: UMLRelationshipKind;
  label: string;
}[] = [
  { value: "inheritance", label: "Inheritance" },
  { value: "realization", label: "Realization" },
  { value: "association", label: "Association" },
  {
    value: "bidirectional-association",
    label: "Bidirectional association",
  },
  { value: "dependency", label: "Dependency" },
  { value: "aggregation", label: "Aggregation" },
  { value: "composition", label: "Composition" },
];

type RelationshipTypePopoverProps = {
  initialKind?: UMLRelationshipKind;
  title: string;
  onSelect: (kind: UMLRelationshipKind) => void;
  onCancel: () => void;
};

export default function RelationshipTypePopover({
  initialKind,
  title,
  onSelect,
  onCancel,
}: RelationshipTypePopoverProps) {
  const [kind, setKind] = useState<UMLRelationshipKind | "">(
    initialKind ?? "",
  );

  return (
    <form
      className="relationship-popover"
      aria-label={title}
      onSubmit={(event) => {
        event.preventDefault();
        if (kind) onSelect(kind);
      }}
    >
      <div className="relationship-popover__heading">{title}</div>
      <select
        autoFocus
        aria-label="Relationship type"
        value={kind}
        onChange={(event) =>
          setKind(event.target.value as UMLRelationshipKind | "")
        }
      >
        <option value="" disabled>
          Choose relationship type
        </option>
        {relationshipOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="relationship-popover__actions">
        <button type="button" className="popover-cancel" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="popover-confirm" disabled={!kind}>
          {initialKind ? "Update" : "Create relationship"}
        </button>
      </div>
    </form>
  );
}
