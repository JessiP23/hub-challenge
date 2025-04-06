import { Tldraw, createShapeId, toRichText, TLShape, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useState, useEffect, useRef } from "react";

class AVLNode {
  id: string;
  value: string;
  x: number;
  y: number;
  height: number;
  children: AVLNode[];

  constructor(id: string, value: string, x: number, y: number) {
    this.id = id;
    this.value = value;
    this.x = x;
    this.y = y;
    this.height = 1;
    this.children = [];
  }
}

export default function TldrawComponent() {
  const [nodeCount, setNodeCount] = useState(2);
  const editorRef = useRef<Editor | null>(null);
  
  const addNode = () => nodeCount < 6 && setNodeCount(nodeCount + 1);
  const removeNode = () => nodeCount > 2 && setNodeCount(nodeCount - 1);

  useEffect(() => {
    if (editorRef.current) {
      window.dispatchEvent(new CustomEvent('nodeCountChanged', { detail: nodeCount }));
    }
  }, [nodeCount]);

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={removeNode} disabled={nodeCount <= 2}>Remove Spoke</button>
        <span style={{ margin: "0 10px" }}>Spokes: {nodeCount}</span>
        <button onClick={addNode} disabled={nodeCount >= 6}>Add Spoke</button>
      </div>
      <div style={{ position: "fixed", width: "80vh", height: "80vh" }}>
        <Tldraw
          hideUi={true}
          onMount={(editor) => {
            editorRef.current = editor;
            
            let treeRoot: AVLNode | null = null;
            let shapeMap = new Map<string, TLShape>();
            let isUpdating = false; 
            let spokeShapes: string[] = []; 
            
            const createAvlTree = (count = nodeCount) => {
              if (isUpdating) return;
              
              isUpdating = true;
              
              const viewport = editor.getViewportPageBounds();
              const prevHubX = treeRoot?.x || (viewport.width / 2 + viewport.x);
              const prevHubY = treeRoot?.y || (viewport.height / 2 + viewport.y);
              
              editor.selectAll();
              editor.deleteShapes(editor.getSelectedShapeIds());
              
              shapeMap.clear();
              spokeShapes = [];
              
              const hubId = createShapeId();
              const hubX = prevHubX;
              const hubY = prevHubY;
              
              treeRoot = new AVLNode(hubId.toString(), "Hub", hubX, hubY);
              
              editor.createShape({
                id: hubId,
                type: "text",
                x: hubX,
                y: hubY,
                props: {
                  richText: toRichText("Hub"),
                },
              });
              
              const hubShape = editor.getShape(hubId);
              if (hubShape) {
                shapeMap.set(hubId.toString(), hubShape);
              }
              
              const circleId = createShapeId();
              const circleRadius = 30; 
              editor.createShape({
                id: circleId,
                type: "geo",
                x: hubX - circleRadius,
                y: hubY - circleRadius,
                props: {
                  geo: "ellipse",
                  w: circleRadius * 2,
                  h: circleRadius * 2,
                  dash: "draw",
                  color: "black",
                  fill: "none",
                },
              });
              
              const radius = 100;
              for (let i = 0; i < count; i++) {
                const angle = (i * 2 * Math.PI) / count;
                const x = hubX + radius * Math.cos(angle);
                const y = hubY + radius * Math.sin(angle);
                const spokeId = createShapeId();
                
                const childNode = new AVLNode(spokeId.toString(), `Spoke ${i+1}`, x, y);
                treeRoot.children.push(childNode);
                
                editor.createShape({
                  id: spokeId,
                  type: "text",
                  x: x,
                  y: y,
                  props: {
                    richText: toRichText(`Spoke ${i+1}`),
                  },
                });
                
                const spokeShape = editor.getShape(spokeId);
                if (spokeShape) {
                  shapeMap.set(spokeId.toString(), spokeShape);
                  spokeShapes.push(spokeId.toString());
                }
                
                const circleEdgeX = hubX + (circleRadius * Math.cos(angle));
                const circleEdgeY = hubY + (circleRadius * Math.sin(angle));
                
                const lineId = createShapeId();
                editor.createShape({
                  id: lineId,
                  type: "draw",
                  x: 0,
                  y: 0,
                  props: {
                    segments: [
                      {
                        type: 'straight',
                        points: [
                          { x: circleEdgeX, y: circleEdgeY }, 
                          { x, y } 
                        ]
                      }
                    ]
                  },
                });
              }
              
              setTimeout(() => {
                isUpdating = false;
              }, 100);
            };
            
            createAvlTree();
            
            const nodeCountHandler = (event: Event) => {
              const customEvent = event as CustomEvent;
              console.log("Node count changed to:", customEvent.detail);
              createAvlTree(customEvent.detail);
            };
            
            window.addEventListener('nodeCountChanged', nodeCountHandler);
            
            editor.on('change', () => {
              if (isUpdating || !treeRoot) return;
              
              const hubShape = shapeMap.get(treeRoot.id);
              if (hubShape && (hubShape.x !== treeRoot.x || hubShape.y !== treeRoot.y)) {
                console.log("Hub moved to:", hubShape.x, hubShape.y);
                
                const deltaX = hubShape.x - treeRoot.x;
                const deltaY = hubShape.y - treeRoot.y;
                
                treeRoot.x = hubShape.x;
                treeRoot.y = hubShape.y;
                
                treeRoot.children.forEach(child => {
                  child.x += deltaX;
                  child.y += deltaY;
                });
                
                createAvlTree();
                return;
              }
              
              for (const spokeId of spokeShapes) {
                const spokeShape = shapeMap.get(spokeId);
                const spokeNode = treeRoot.children.find(child => child.id === spokeId);
                
                if (spokeShape && spokeNode && 
                    (spokeShape.x !== spokeNode.x || spokeShape.y !== spokeNode.y)) {
                  console.log("Spoke moved:", spokeId);
                  spokeNode.x = spokeShape.x;
                  spokeNode.y = spokeShape.y;
                  createAvlTree();
                  return;
                }
              }
            });
            
            return () => {
              window.removeEventListener('nodeCountChanged', nodeCountHandler);
            };
          }}
        />
      </div>
    </div>
  );
}