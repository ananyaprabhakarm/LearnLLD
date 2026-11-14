import { createContext, useContext } from "react";
import type { UMLClassNodeData } from "../diagram/types";

export type UMLBorderPoint = {
  side: "top" | "right" | "bottom" | "left";
  offset: number;
};

export function getUMLBorderPoint(
  rect: DOMRect,
  clientX: number,
  clientY: number,
): UMLBorderPoint | null {
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
  return { side: nearest.side, offset };
}

type ClassNodeActions = {
  updateClassData: (
    nodeId: string,
    update: (current: UMLClassNodeData) => UMLClassNodeData,
  ) => void;
  onBorderPointerDown: (
    nodeId: string,
    point: UMLBorderPoint,
    clientX: number,
    clientY: number,
  ) => void;
};

export const ClassNodeActionsContext = createContext<ClassNodeActions | null>(
  null,
);

export function useClassNodeActions() {
  const actions = useContext(ClassNodeActionsContext);
  if (!actions) {
    throw new Error("ClassNode must be rendered inside its actions provider.");
  }
  return actions;
}
