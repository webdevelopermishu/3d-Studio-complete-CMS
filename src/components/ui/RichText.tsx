import type { ReactNode } from "react";
import { safeHref, slugify } from "@/lib/utils";

type PMNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: PMNode[];
};

/** Server-side renderer for Tiptap/ProseMirror JSON. Unknown nodes are skipped; links are scheme-checked. */
export function RichText({ doc, className = "prose" }: { doc: unknown; className?: string }) {
  const d = doc as PMNode | null;
  if (!d || d.type !== "doc" || !d.content?.length) return null;
  return <div className={className}>{d.content.map((n, i) => renderNode(n, i))}</div>;
}

export function richTextToPlain(doc: unknown): string {
  const walk = (n: PMNode): string => (n.text ?? "") + (n.content ?? []).map(walk).join(n.type === "doc" ? "\n" : "");
  const d = doc as PMNode | null;
  return d ? walk(d).trim() : "";
}

export function richTextHeadings(doc: unknown): { id: string; text: string }[] {
  const d = doc as PMNode | null;
  return (d?.content ?? [])
    .filter((n) => n.type === "heading" && n.attrs?.level === 2)
    .map((n) => {
      const text = (n.content ?? []).map((c) => c.text ?? "").join("");
      return { id: slugify(text), text };
    });
}

function renderMarks(text: string, marks: PMNode["marks"], key: number): ReactNode {
  let out: ReactNode = text;
  for (const m of marks ?? []) {
    if (m.type === "bold") out = <strong>{out}</strong>;
    else if (m.type === "italic") out = <em>{out}</em>;
    else if (m.type === "code") out = <code>{out}</code>;
    else if (m.type === "link") {
      const href = safeHref(String(m.attrs?.href ?? ""));
      const ext = /^https?:/i.test(href);
      out = (
        <a href={href} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {out}
        </a>
      );
    }
  }
  return <span key={key}>{out}</span>;
}

function kids(n: PMNode) {
  return (n.content ?? []).map((c, i) => renderNode(c, i));
}

function renderNode(n: PMNode, key: number): ReactNode {
  switch (n.type) {
    case "paragraph":
      return n.content?.length ? <p key={key} className="prose__p">{kids(n)}</p> : null;
    case "heading": {
      const level = Math.min(4, Math.max(2, Number(n.attrs?.level ?? 2)));
      const text = (n.content ?? []).map((c) => c.text ?? "").join("");
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      return (
        <Tag key={key} id={level === 2 ? slugify(text) : undefined} className={`prose__h${level}`}>
          {kids(n)}
        </Tag>
      );
    }
    case "bulletList":
      return <ul key={key} className="prose__list prose__list--bullet">{kids(n)}</ul>;
    case "orderedList":
      return <ol key={key} className="prose__list prose__list--number">{kids(n)}</ol>;
    case "listItem":
      return <li key={key} className="prose__item">{(n.content ?? []).flatMap((c) => (c.type === "paragraph" ? kids(c) : [renderNode(c, 0)]))}</li>;
    case "blockquote":
      return <blockquote key={key} className="prose__quote">{kids(n)}</blockquote>;
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "text":
      return renderMarks(n.text ?? "", n.marks, key);
    default:
      return null;
  }
}
