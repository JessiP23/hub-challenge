import { Tldraw, createShapeId, toRichText, TLShape, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useState, useEffect, useRef } from "react";

// AVL Tree node class
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
  
  // Add/Remove node buttons
  const addNode = () => nodeCount < 6 && setNodeCount(nodeCount + 1);
  const removeNode = () => nodeCount > 2 && setNodeCount(nodeCount - 1);

  // Refresh when nodeCount changes
  useEffect(() => {
    // Simply dispatch a custom event that our editor will listen for
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
            
            // Store references to shapes for tracking
            let treeRoot: AVLNode | null = null;
            let shapeMap = new Map<string, TLShape>();
            let isUpdating = false; // Add flag to prevent infinite loops
            let spokeShapes: string[] = []; // Track spoke IDs for movement tracking
            
            const createAvlTree = () => {
              if (isUpdating) return; // Prevent recursive calls
              
              isUpdating = true;
              
              // Remember hub position if it exists
              const prevHubX = treeRoot?.x || 150;
              const prevHubY = treeRoot?.y || 150;
              
              // Clear canvas
              editor.selectAll();
              editor.deleteShapes(editor.getSelectedShapeIds());
              
              // Reset tracking arrays
              shapeMap.clear();
              spokeShapes = [];
              
              // Create hub shape (root node)
              const hubId = createShapeId();
              const hubX = prevHubX;
              const hubY = prevHubY;
              
              treeRoot = new AVLNode(hubId.toString(), "Hub", hubX, hubY);
              
              // Create the hub shape
              editor.createShape({
                id: hubId,
                type: "text",
                x: hubX,
                y: hubY,
                props: {
                  richText: toRichText("Hub"),
                },
              });
              
              // Get the created shape and add it to our map
              const hubShape = editor.getShape(hubId);
              if (hubShape) {
                shapeMap.set(hubId.toString(), hubShape);
              }
              
              // Create spoke nodes in a balanced arrangement
              const radius = 100;
              for (let i = 0; i < nodeCount; i++) {
                const angle = (i * 2 * Math.PI) / nodeCount;
                const x = hubX + radius * Math.cos(angle);
                const y = hubY + radius * Math.sin(angle);
                const spokeId = createShapeId();
                
                // Create child node in AVL tree
                const childNode = new AVLNode(spokeId.toString(), `Spoke ${i+1}`, x, y);
                treeRoot.children.push(childNode);
                
                // Create the spoke shape
                editor.createShape({
                  id: spokeId,
                  type: "text",
                  x: x,
                  y: y,
                  props: {
                    richText: toRichText(`Spoke ${i+1}`),
                  },
                });
                
                // Get the created shape and add it to our map
                const spokeShape = editor.getShape(spokeId);
                if (spokeShape) {
                  shapeMap.set(spokeId.toString(), spokeShape);
                  spokeShapes.push(spokeId.toString());
                }
                
                // Create a line using a draw shape instead
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
                          { x: hubX, y: hubY },
                          { x, y }
                        ]
                      }
                    ]
                  },
                });
              }
              
              // Reset update flag after a small delay to ensure we're done with the update cycle
              setTimeout(() => {
                isUpdating = false;
              }, 100);
            };
            
            // Initial creation
            createAvlTree();
            
            // Listen for nodeCount changes
            const nodeCountHandler = (event: Event) => {
              if (!isUpdating) {
                const customEvent = event as CustomEvent;
                console.log("Node count changed to:", customEvent.detail);
                createAvlTree();
              }
            };
            
            window.addEventListener('nodeCountChanged', nodeCountHandler);
            
            // Track both hub and spoke movements
            editor.on('change', () => {
              if (isUpdating || !treeRoot) return;
              
              // Check if hub moved
              const hubShape = shapeMap.get(treeRoot.id);
              if (hubShape && (hubShape.x !== treeRoot.x || hubShape.y !== treeRoot.y)) {
                console.log("Hub moved to:", hubShape.x, hubShape.y);
                treeRoot.x = hubShape.x;
                treeRoot.y = hubShape.y;
                createAvlTree(); // Redraw the tree centered on the new hub position
                return;
              }
              
              // Check if any spoke moved
              for (const spokeId of spokeShapes) {
                const spokeShape = shapeMap.get(spokeId);
                const spokeNode = treeRoot.children.find(child => child.id === spokeId);
                
                if (spokeShape && spokeNode && 
                    (spokeShape.x !== spokeNode.x || spokeShape.y !== spokeNode.y)) {
                  console.log("Spoke moved:", spokeId);
                  spokeNode.x = spokeShape.x;
                  spokeNode.y = spokeShape.y;
                  createAvlTree(); // Redraw with updated spoke position
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