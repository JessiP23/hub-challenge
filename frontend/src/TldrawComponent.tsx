import { Tldraw, createShapeId, toRichText } from "tldraw";
import "tldraw/tldraw.css";

export default function TldrawComponent() {
  return (
    <div style={{ position: "fixed", width: "50vh", height: "50vh" }}>
      <Tldraw
        hideUi={true}
        onMount={(editor) => {
          // Create a hub shape at the center
          editor.createShape({
            id: createShapeId(),
            type: "text",
            x: 150,
            y: 150,
            props: {
              richText: toRichText("Hub"),
            },
          });
          // Create two spoke shapes positioned to the left and right
          [{ x: 50, y: 150 }, { x: 250, y: 150 }].forEach((pos) =>
            editor.createShape({
              id: createShapeId(),
              type: "text",
              x: pos.x,
              y: pos.y,
              props: {
                richText: toRichText("Spoke"),
              },
            })
          );
          return () => {};
        }}
      />
    </div>
  );
}