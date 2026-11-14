import { createContext, useContext } from "react";
import type { UMLClassNodeData } from "../diagram/types";

export type UMLBorderPoint = {
  side: "top" | "right" | "bottom" | "left";
  offset: number;
};

type ClassNodeActions = {
  updateClassData: (
    nodeId: string,
    update: (current: UMLClassNodeData) => UMLClassNodeData,
  ) => void;
  onBorderClick: (
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
