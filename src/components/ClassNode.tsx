import { Handle, Position, type NodeProps } from "@xyflow/react";

type ClassNodeData = {
  name: string;
  attributes: string[];
  methods: string[];
};

export default function ClassNode({ data }: NodeProps) {
  const classData = data as ClassNodeData;

  return (
    <div className="class-node">
      {/* Connection point at the top */}
      <Handle type="target" position={Position.Top} />

      {/* Class name */}
      <div className="class-node__header">{classData.name}</div>

      {/* Attributes section */}
      <div className="class-node__section">
        {classData.attributes.map((attribute, index) => (
          <div key={index}>- {attribute}</div>
        ))}
      </div>

      {/* Methods section */}
      <div className="class-node__section">
        {classData.methods.map((method, index) => (
          <div key={index}>+ {method}</div>
        ))}
      </div>

      {/* Connection point at the bottom */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
