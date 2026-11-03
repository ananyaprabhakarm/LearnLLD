import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { UMLClassNodeData } from '../diagram/types'
import './ClassNode.css'

type ClassFlowNode = Node<UMLClassNodeData, 'class'>

export default function ClassNode({ data }: NodeProps<ClassFlowNode>) {
  return (
    <div className="class-node">
      <Handle type="target" position={Position.Top} />

      <div className="class-node__header">{data.name}</div>

      <div className="class-node__section">
        {data.attributes.map((attribute) => (
          <div key={attribute.id}>- {attribute.name}: {attribute.type}</div>
        ))}
      </div>

      <div className="class-node__section class-node__section--methods">
        {data.methods.map((method) => (
          <div key={method.id}>+ {method.name}(): {method.returnType}</div>
        ))}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
