"use client";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Undo2, Redo2, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

type Doc = { type: "doc"; content?: unknown[] } | null;

/** Tiptap editor storing ProseMirror JSON (rendered server-side by components/ui/RichText). */
export function RichTextEditor({ value, onChange, minimal, label }: { value: Doc; onChange: (d: Doc) => void; minimal?: boolean; label?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, link: false }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https", "mailto", "tel"], HTMLAttributes: { rel: "noopener noreferrer" } }),
    ],
    content: (value ?? { type: "doc", content: [{ type: "paragraph" }] }) as JSONContent,
    editorProps: {
      attributes: {
        class: "prose-admin min-h-[140px] px-3 py-2.5 text-sm leading-relaxed text-zinc-900 focus:outline-none",
        "aria-label": label ?? "Rich text",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON() as Doc;
      onChange(editor.isEmpty ? null : json);
    },
  });
  if (!editor) return <div className="h-[180px] rounded-md border border-zinc-300 bg-zinc-50" />;

  const btn = (active: boolean, onClick: () => void, Icon: typeof Bold, title: string) => (
    <button type="button" title={title} aria-label={title} aria-pressed={active} onClick={onClick} className={cn("rounded p-1.5 text-zinc-600 hover:bg-zinc-200", active && "bg-zinc-200 text-zinc-900")}>
      <Icon className="size-4" />
    </button>
  );
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://…, /path, mailto:)", prev ?? "https://");
    if (url === null) return;
    if (!url) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else if (/^(https?:|mailto:|tel:|\/)/.test(url)) editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };
  return (
    <div className="overflow-hidden rounded-md border border-zinc-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-1.5 py-1">
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), Bold, "Bold")}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), Italic, "Italic")}
        {btn(editor.isActive("link"), setLink, Link2, "Link")}
        {!minimal && (
          <>
            <span className="mx-1 h-4 w-px bg-zinc-300" />
            {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), Heading2, "Heading 2")}
            {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), Heading3, "Heading 3")}
            {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), List, "Bullet list")}
            {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), ListOrdered, "Numbered list")}
            {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), Quote, "Quote")}
            {btn(false, () => editor.chain().focus().setHorizontalRule().run(), Minus, "Divider")}
          </>
        )}
        <span className="ml-auto" />
        {btn(false, () => editor.chain().focus().undo().run(), Undo2, "Undo")}
        {btn(false, () => editor.chain().focus().redo().run(), Redo2, "Redo")}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
