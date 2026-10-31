import { useCallback, useState } from 'react'
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import Brand from './components/Brand'

// TEMPORARY FLOW DATA SHAPE. Replace with your durable UML model in src/diagram/types.ts.
type TemporaryClassData = { label: string; temporary?: boolean }
type DiagramNode = Node<TemporaryClassData, 'class'>

const initialNodes: DiagramNode[] = [
  { id: 'user', type: 'class', position: { x: 170, y: 110 }, data: { label: 'User' } },
  { id: 'order', type: 'class', position: { x: 500, y: 260 }, data: { label: 'Order' } },
]

const initialEdges: Edge[] = [
  { id: 'user-order', source: 'user', target: 'order', label: 'places', type: 'smoothstep' },
]

// PLACEHOLDER: replace with your reusable UML class node from src/components/ClassNode.tsx.
function TemporaryClassNode({ data }: { data: TemporaryClassData }) {
  return (
    <div className="class-node">
      <strong>{data.label}</strong>
      <div className="class-node-section">Attributes go here</div>
      <div className="class-node-section">Methods go here</div>
      {data.temporary && <span className="temporary-tag">TEMPORARY NODE</span>}
    </div>
  )
}

const nodeTypes = { class: TemporaryClassNode }

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<DiagramNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => setEdges((current) => addEdge(connection, current)),
    [setEdges],
  )

  const addClass = () => {
    const id = `class-${Date.now()}`
    setNodes((current) => [
      ...current,
      {
        id,
        type: 'class',
        position: { x: 220 + (current.length % 4) * 50, y: 130 + (current.length % 4) * 50 },
        data: { label: 'New Class', temporary: true },
      },
    ])
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Brand />
        <div className="workspace-title"><span>Workspace</span><strong>Untitled diagram</strong></div>
        <div className="topbar-spacer" />
        <span className="save-state"><span className="status-dot" />Local draft</span>
        <button className="share-button" type="button" disabled title="Saving and sharing arrive later">Share</button>
      </header>

      <div className="workspace">
        <aside className="toolbar" aria-label="Diagram tools">
          <button className="tool-button active" type="button" aria-label="Select and move nodes" title="Select and move nodes"><span>↖</span></button>
          <div className="tool-divider" />
          <button className="tool-button add-tool" type="button" onClick={addClass} title="Add a temporary class node"><span>＋</span><small>Class</small></button>
          <div className="toolbar-note">Drag nodes to arrange them. Connect the handles to show a relationship.</div>
        </aside>

        <section className="canvas-area" aria-label="Diagram canvas">
          <div className="canvas-heading"><div><p className="eyebrow">DIAGRAM CANVAS</p><h1>Untitled diagram</h1></div><span className="canvas-hint">Changes are held in this browser session</span></div>
          <div className="flow-frame">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              defaultEdgeOptions={{ type: 'smoothstep', animated: false }}
              minZoom={0.25}
              maxZoom={1.8}
            >
              <Background color="#dfe4eb" gap={22} size={1} />
              <Controls position="bottom-left" />
              <MiniMap position="bottom-right" nodeColor="#97a7c1" maskColor="rgb(247 248 250 / 65%)" />
            </ReactFlow>
            <div className="canvas-legend"><span className="legend-line" /> Relationship</div>
          </div>
        </section>
      </div>
    </main>
  )
}

export default App
