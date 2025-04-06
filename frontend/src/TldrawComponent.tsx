import { Tldraw, createShapeId, toRichText, TLShape } from "tldraw";
import "tldraw/tldraw.css";
import { useState } from "react";

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
  
  // Add/Remove node buttons
  const addNode = () => nodeCount < 6 && setNodeCount(nodeCount + 1);
  const removeNode = () => nodeCount > 2 && setNodeCount(nodeCount - 1);

  return (
    <div>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={removeNode} disabled={nodeCount <= 2}>Remove Spoke</button>
        <span style={{ margin: "0 10px" }}>Spokes: {nodeCount}</span>
        <button onClick={addNode} disabled={nodeCount >= 6}>Add Spoke</button>
      </div>
      <div style={{ position: "fixed", width: "50vh", height: "50vh" }}>
        <Tldraw
          hideUi={true}
          onMount={(editor) => {
            // Store references to shapes for tracking
            let treeRoot: AVLNode | null = null;
            let shapeMap = new Map<string, TLShape>();
            let isUpdating = false; // Add flag to prevent infinite loops
            
            const createAvlTree = () => {
              if (isUpdating) return; // Prevent recursive calls
              
              isUpdating = true;
              
              // Clear canvas
              editor.selectAll();
              editor.deleteShapes(editor.getSelectedShapeIds());
              
              // Create hub shape (root node)
              const hubId = createShapeId();
              const hubX = treeRoot?.x || 150;
              const hubY = treeRoot?.y || 150;
              
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
                }
                
                // Create a line using a draw shape instead
                editor.createShape({
                  id: createShapeId(),
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
            
            // Watch for changes but prevent infinite loops
            let updateTimeout: any = null;
            editor.on('change', () => {
              if (isUpdating || !treeRoot) return;
              
              // Clear any pending updates
              if (updateTimeout) clearTimeout(updateTimeout);
              
              // Debounce the update to avoid excessive redraws
              updateTimeout = setTimeout(() => {
                // Check if treeRoot is still valid when timeout executes
                if (!treeRoot) return;
                
                // Check if hub moved
                const hubShape = shapeMap.get(treeRoot.id);
                if (hubShape && (hubShape.x !== treeRoot.x || hubShape.y !== treeRoot.y)) {
                  treeRoot.x = hubShape.x;
                  treeRoot.y = hubShape.y;
                  createAvlTree(); // Redraw the tree
                }
              }, 200);
            });
            
            // Handle node count changes
            editor.on('update', () => {
              if (!isUpdating) {
                createAvlTree();
              }
            });
            
            return () => {
              if (updateTimeout) clearTimeout(updateTimeout);
            };
          }}
        />
      </div>
    </div>
  );
}