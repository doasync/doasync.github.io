# Enhanced Plan: Rich Markdown, Syntax Highlighting, LaTeX Math, and Mermaid Support in Chat UI

---

## Overview

We will enhance the chat interface to support:

- **Markdown formatting:** Bold, italics, lists, tables, links, etc.
- **Syntax highlighting:** For code blocks inside triple backticks with language detection.
- **LaTeX math rendering:** Inline `$...$` and block `$$...$$` formulas, rendered visually.
- **Mermaid diagrams:** Flowcharts, sequence diagrams, etc., embedded in markdown.

---

## Libraries & Plugins

| Feature               | Library/Plugin             | Purpose                                         |
| --------------------- | -------------------------- | ----------------------------------------------- |
| Markdown parsing      | `react-markdown`           | Core markdown renderer in React                 |
| GitHub Flavored MD    | `remark-gfm`               | Tables, strikethrough, task lists               |
| Syntax highlighting   | `react-syntax-highlighter` | Code block highlighting (Prism or Highlight.js) |
| Math parsing          | `remark-math`              | Parse LaTeX math inside markdown                |
| Math rendering        | `rehype-katex`             | Render math with KaTeX                          |
| Mermaid diagrams      | `remark-mermaid`           | Parse Mermaid code blocks                       |
| Math rendering engine | `katex`                    | Fast LaTeX rendering                            |
| Diagram rendering     | `mermaid`                  | Render diagrams from Mermaid syntax             |

---

## Architecture Diagram

```mermaid
flowchart TD
    subgraph Chat Message Rendering
        A[Raw Markdown with GFM, Math, Code, Mermaid]
        A --> B[react-markdown]
        B --> C[remark-gfm]
        B --> D[remark-math]
        B --> E[remark-mermaid]
        C --> F[rehype-katex (KaTeX)]
        D --> F
        E --> G[Mermaid Renderer]
        B --> H[react-syntax-highlighter for code blocks]
    end
```

---

## Implementation Steps

### 1. **Install dependencies**

```bash
npm install react-markdown remark-gfm remark-math rehype-katex react-syntax-highlighter katex mermaid remark-mermaid
```

### 2. **Import styles**

In your global CSS (e.g., `src/app/globals.css`):

```css
@import "katex/dist/katex.min.css";
@import "mermaid/dist/mermaid.min.css";
```

### 3. **Create `MarkdownRenderer` component**

Encapsulate all rendering logic:

```tsx
import React, { useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import remarkMermaid from "remark-mermaid";
import mermaid from "mermaid";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  content: string;
}

const MarkdownRenderer: React.FC<Props> = ({ content }) => {
  useEffect(() => {
    mermaid.init(undefined, ".language-mermaid");
  }, [content]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkMermaid]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          if (match && match[1] === "mermaid") {
            return (
              <div className="mermaid">
                {String(children).replace(/\n$/, "")}
              </div>
            );
          }
          return !inline && match ? (
            <SyntaxHighlighter
              style={dracula}
              language={match[1]}
              PreTag="div"
              {...props}
            >
              {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
          ) : (
            <code className={className} {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default MarkdownRenderer;
```

### 4. **Integrate into chat UI**

In `src/components/MessageItem.tsx`, replace:

```tsx
<Typography variant="body1" whiteSpace={"pre-wrap"}>
  {message.content}
</Typography>
```

with:

```tsx
<MarkdownRenderer content={message.content} />
```

- Keep the editing mode as plain `<InputBase>` with raw markdown text.
- Render formatted output only when **not editing**.

### 5. **Styling**

- Adjust KaTeX and Mermaid styles as needed.
- Customize code block themes via `react-syntax-highlighter`.
- Ensure output fits well inside chat bubbles.

---

## Benefits

- **Rich Markdown support** with tables, task lists, strikethrough.
- **Beautiful syntax-highlighted code blocks** with language detection.
- **Rendered LaTeX math** inline and block, no raw $$...$$ text.
- **Embedded diagrams** for flowcharts, sequences, etc.
- **Extensible** for future features.

---

## Considerations

- **Security:** Avoid rendering raw HTML for safety.
- **Performance:** Acceptable for typical chat sizes; optimize if needed.
- **Bundle size:** Acceptable; can optimize syntax highlighter languages if necessary.
- **Accessibility:** KaTeX and Mermaid support screen readers reasonably well.

---

## Summary

This plan will transform your chat UI into a **rich, expressive interface** supporting Markdown, code, math, and diagrams, enhancing user experience and communication power.
