export type UMLAttribute = {
  id: String;
  name: String;
  type: String;
};

export type UMLMethod = {
  id: String;
  name: String;
  returnType: String;
};

export type UMLClass = {
  id: String;
  name: String;
  attributes: UMLAttribute[];
  methods: UMLMethod[];
};

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
