export type UMLAttribute = {
  id: string;
  name: string;
  type: string;
};

export type UMLMethod = {
  id: string;
  name: string;
  returnType: string;
};

export type UMLClass = {
  id: string;
  position: { x: number; y: number };
  name: string;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
};

// React Flow stores class fields in `data`; position and id stay on the node itself.
export type UMLClassNodeData = Pick<UMLClass, 'name' | 'attributes' | 'methods'>;

// UI-only data used by the React Flow node to mount its hidden edge anchors.
export type UMLClassNodeFlowData = UMLClassNodeData & {
  sourceHandleIds: string[];
  targetHandleIds: string[];
};

export type UMLRelationshipKind =
  | "inheritance"
  | "realization"
  | "association"
  | "bidirectional-association"
  | "dependency"
  | "aggregation"
  | "composition";

export type UMLRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: UMLRelationshipKind;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type UMLDiagram = {
  classes: UMLClass[];
  relationships: UMLRelationship[];
};

export type UMLCanvas = UMLDiagram & {
  id: string;
  name: string;
};

export type UMLWorkspace = {
  id: string;
  name: string;
  canvases: UMLCanvas[];
};
