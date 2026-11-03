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

export type UMLRelationshipKind =
  | "inheritance"
  | "association"
  | "aggregation"
  | "composition"
  | "dependency";

export type UMLRelationship = {
  id: string;
  sourceId: string;
  targetId: string;
  kind: UMLRelationshipKind;
};

export type UMLDiagram = {
  classes: UMLClass[];
  relationships: UMLRelationship[];
};
