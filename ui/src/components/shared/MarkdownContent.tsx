import { useEffect, useRef } from "react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

function MermaidBlock({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      if (!ref.current) return;
      const mermaid = (await import("mermaid")).default;
      if (cancelled) return;
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
      });
      mermaid.run({ nodes: [ref.current] });
    }
    render();
    return () => { cancelled = true; };
  }, [code]);

  return (
    <div className="my-4 flex justify-center">
      <div ref={ref} className="mermaid">
        {code}
      </div>
    </div>
  );
}

export function MarkdownContent({ content }: { content: string }) {
  useEffect(() => {
    import("highlight.js/styles/a11y-dark.css");
  }, []);

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      <Markdown
        rehypePlugins={[
          [rehypeSanitize, {
            tagNames: ["pre", "code", "div", "span", "svg", "path", "g", "rect", "circle", "line", "text", "defs", "marker", "polygon", "polyline"],
            attributes: {
              div: ["className"],
              pre: ["className"],
              code: ["className"],
              span: ["className", "style"],
              svg: ["className", "viewBox", "width", "height", "xmlns", "style"],
              path: ["d", "fill", "stroke", "strokeWidth", "stroke-width", "className"],
              g: ["className", "transform", "fill"],
              rect: ["x", "y", "width", "height", "fill", "stroke", "rx", "ry"],
              circle: ["cx", "cy", "r", "fill", "stroke"],
              line: ["x1", "y1", "x2", "y2", "stroke", "strokeWidth"],
              text: ["x", "y", "fill", "fontSize", "text-anchor", "className"],
              defs: ["className"],
              marker: ["id", "viewBox", "refX", "refY", "markerWidth", "markerHeight", "orient"],
              polygon: ["points", "fill", "stroke"],
              polyline: ["points", "fill", "stroke"],
            },
          }],
          rehypeHighlight,
        ]}
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeStr = String(children).replace(/\n$/, "");
            if (match && match[1] === "mermaid") {
              return <MermaidBlock code={codeStr} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
