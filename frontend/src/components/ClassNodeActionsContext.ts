import { createContext, useContext } from "react";
import type { UMLClassNodeData } from "../diagram/types";

type ClassNodeActions = {
  updateClassData: (
    nodeId: string,
    update: (current: UMLClassNodeData) => UMLClassNodeData,
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
