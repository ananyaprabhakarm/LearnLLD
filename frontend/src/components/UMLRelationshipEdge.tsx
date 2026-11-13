import { BaseEdge, type Edge, type EdgeProps } from "@xyflow/react";
import type { UMLRelationshipKind } from "../diagram/types";

export type UMLRelationshipEdgeData = {
  kind: UMLRelationshipKind;
  curveOffset?: number;
};
export type UMLRelationshipFlowEdge = Edge<
  UMLRelationshipEdgeData,
  "umlRelationship"
>;

type MarkerStyle = "triangle" | "open-arrow" | "diamond" | "filled-diamond";

const markerByKind: Record<
  UMLRelationshipKind,
  { start?: MarkerStyle; end?: MarkerStyle; dashed?: boolean }
> = {
  inheritance: { end: "triangle" },
  realization: { end: "triangle", dashed: true },
  association: { end: "open-arrow" },
  "bidirectional-association": {
    start: "open-arrow",
    end: "open-arrow",
  },
  dependency: { end: "open-arrow", dashed: true },
  aggregation: { start: "diamond" },
  composition: { start: "filled-diamond" },
};

function markerPath(style: MarkerStyle) {
  if (style === "triangle") return "M 0 0 L 10 5 L 0 10 Z";
  if (style === "open-arrow") return "M 0 0 L 10 5 L 0 10";
  return "M 0 5 L 5 0 L 10 5 L 5 10 Z";
}

function markerFill(style: MarkerStyle, stroke: string) {
  if (style === "triangle" || style === "diamond") return "#fff";
  if (style === "filled-diamond") return stroke;
  return "none";
}

export default function UMLRelationshipEdge({
  id,
  data,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: EdgeProps<UMLRelationshipFlowEdge>) {
  const kind = data?.kind;
  if (!kind) return null;
  const markers = markerByKind[kind];
  const stroke = selected ? "#315f9d" : "#8597b2";
  const markerPrefix = `uml-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const startMarkerId = `${markerPrefix}-start`;
  const endMarkerId = `${markerPrefix}-end`;
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.hypot(dx, dy);
  const normalX = distance > 0 ? -dy / distance : 0;
  const normalY = distance > 0 ? dx / distance : 1;
  const curveOffset = data?.curveOffset ?? 20;
  const control1X = sourceX + dx / 3 + normalX * curveOffset;
  const control1Y = sourceY + dy / 3 + normalY * curveOffset;
  const control2X = targetX - dx / 3 + normalX * curveOffset;
  const control2Y = targetY - dy / 3 + normalY * curveOffset;
  const edgePath = `M ${sourceX},${sourceY} C ${control1X},${control1Y} ${control2X},${control2Y} ${targetX},${targetY}`;

  const renderMarker = (markerId: string, style: MarkerStyle) => (
    <marker
      id={markerId}
      key={markerId}
      markerWidth="12"
      markerHeight="12"
      viewBox="0 0 10 10"
      refX="10"
      refY="5"
      orient="auto-start-reverse"
      markerUnits="userSpaceOnUse"
    >
      <path
        d={markerPath(style)}
        fill={markerFill(style, stroke)}
        stroke={stroke}
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </marker>
  );

  return (
    <>
      {(markers.start || markers.end) && (
        <defs>
          {markers.start && renderMarker(startMarkerId, markers.start)}
          {markers.end && renderMarker(endMarkerId, markers.end)}
        </defs>
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={markers.start ? `url(#${startMarkerId})` : undefined}
        markerEnd={markers.end ? `url(#${endMarkerId})` : undefined}
        interactionWidth={18}
        style={{
          stroke,
          strokeWidth: selected ? 2.8 : 1.7,
          strokeDasharray: markers.dashed ? "6 4" : undefined,
        }}
      />
    </>
  );
}
