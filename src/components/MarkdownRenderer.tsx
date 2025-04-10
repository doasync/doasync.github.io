"use client"; // Required for client-side Mermaid rendering in Next.js

import React from "react"; // Removed useEffect import
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm"; // Tables, strikethrough, etc.
import remarkMath from "remark-math"; // Parse $math$ and $$math$$
import rehypeKatex from "rehype-katex"; // Render math using KaTeX
// Removed remark-mermaid and mermaid imports
import { MermaidDiagram } from "@lightenna/react-mermaid-diagram"; // Import the new component
// Prism React Renderer for syntax highlighting
import { Highlight, themes } from "prism-react-renderer";
// remark-mermaid attempts to handle this, but if diagrams don't render,
// we might need a client-only wrapper component for the Mermaid part.

interface MarkdownRendererProps {
  content: string;
}

// Define a minimal interface for the props we use in the code component
interface CustomCodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  // Include other props from ReactMarkdown's CodeProps if needed, like 'ref'
  ref?: React.Ref<HTMLElement>;
  [key: string]: any; // Allow other props
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Removed the useEffect hook for manual Mermaid initialization
  // The @lightenna/react-mermaid-diagram component handles this internally.
  return (
    <ReactMarkdown
      children={content}
      remarkPlugins={[remarkGfm, remarkMath]} // Removed remarkMermaid
      rehypePlugins={[rehypeKatex]} // Enable KaTeX rendering
      components={{
        // Custom renderer for code blocks using react-syntax-highlighter
        // Use the custom interface to guide type checking
        code({
          node,
          inline,
          className,
          children,
          style,
          ref,
          ...props
        }: CustomCodeProps) {
          const match = /language-(\w+)/.exec(className || "");
          const codeContent = String(children).replace(/\n$/, ""); // Remove trailing newline

          // Handle Mermaid blocks using the new component
          if (match && match[1] === "mermaid") {
            return (
              <div style={{ marginTop: "8px", marginBottom: "8px" }}>
                {" "}
                {/* Optional wrapper for spacing */}
                <MermaidDiagram>{codeContent}</MermaidDiagram>
              </div>
            );
          }

          // Render syntax-highlighted code blocks using prism-react-renderer
          return !inline && match ? (
            <Highlight
              code={codeContent}
              language={match[1] as any}
              theme={themes.vsDark}
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  className={className}
                  style={{
                    ...style,
                    padding: "12px",
                    borderRadius: "6px",
                    overflowX: "auto",
                  }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })}>
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          ) : (
            // Render inline code or code blocks without a language tag
            <code
              className={className}
              {...props}
              style={{
                backgroundColor: "rgba(128, 128, 128, 0.15)", // Subtle background for inline code
                padding: "0.1em 0.3em",
                borderRadius: "4px",
                fontFamily: "monospace",
                fontSize: "0.9em",
              }}
            >
              {children}
            </code>
          );
        },
        // Optional: Customize table rendering to use MUI Table components if needed
        // table: ({node, ...props}) => <Table size="small" {...props} />,
        // thead: ({node, ...props}) => <TableHead {...props} />,
        // tbody: ({node, ...props}) => <TableBody {...props} />,
        // tr: ({node, ...props}) => <TableRow {...props} />,
        // td: ({node, ...props}) => <TableCell align="left" {...props} />,
        // th: ({node, ...props}) => <TableCell align="left" component="th" scope="col" {...props} />,
      }}
    />
  );
};

export default MarkdownRenderer;
