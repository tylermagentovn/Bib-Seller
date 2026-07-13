import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { useRef, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  Bold, Italic, Heading2, Heading3,
  List, ListOrdered, Link as LinkIcon, Unlink,
  Image as ImageIcon, Minus, Loader2,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
}

function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ value, onChange }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "tiptap-content min-h-[180px] px-3 py-2.5 outline-none",
      },
    },
  });

  // Sync external value changes (e.g. when editing form resets)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ url: string }>("/uploads", formData);
      const url = res.data.url.startsWith("http") ? res.data.url : `${window.location.origin}${res.data.url}`;
      editor.chain().focus().setImage({ src: url }).run();
    } catch {
      alert("Upload ảnh thất bại");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleLink = () => {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Nhập URL:");
    if (!url) return;
    editor.chain().focus().setLink({ href: url.startsWith("http") ? url : `https://${url}` }).run();
  };

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-input bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="In đậm">
          <Bold className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="In nghiêng">
          <Italic className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Tiêu đề 2">
          <Heading2 className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Tiêu đề 3">
          <Heading3 className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Danh sách">
          <List className="h-4 w-4" />
        </ToolbarBtn>
        <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Danh sách số">
          <ListOrdered className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn onClick={handleLink} active={editor.isActive("link")} title={editor.isActive("link") ? "Gỡ link" : "Chèn link"}>
          {editor.isActive("link") ? <Unlink className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
        </ToolbarBtn>

        <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Đường kẻ ngang">
          <Minus className="h-4 w-4" />
        </ToolbarBtn>

        <span className="w-px h-5 bg-gray-200 mx-1" />

        <ToolbarBtn onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Chèn ảnh">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </ToolbarBtn>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
