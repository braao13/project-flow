import { FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

function humanSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function iconFor(type: string) {
  if (type.startsWith("image/")) return ImageIcon;
  return FileText;
}

export function TaskAttachments({ taskId }: { taskId: string }) {
  const { getAttachmentsByTask, addAttachment, deleteAttachment, getAttachmentUrl } = useStore();
  const files = getAttachmentsByTask(taskId);
  const inputRef = useRef<HTMLInputElement>(null);

  const openFile = async (path: string, name: string) => {
    const url = await getAttachmentUrl(path);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {files.map((f) => {
          const Icon = iconFor(f.type);
          return (
            <li key={f.id} className="glass rounded-lg p-3 flex items-center gap-3 group">
              <Icon className="size-4 text-muted-foreground shrink-0" />
              <button onClick={() => openFile(f.path, f.name)} className="flex-1 min-w-0 text-sm truncate hover:text-primary text-left">
                {f.name}
              </button>
              <span className="text-xs text-muted-foreground">{humanSize(f.size)}</span>
              <button onClick={() => deleteAttachment(f.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          );
        })}
        {files.length === 0 && (
          <li className="text-xs text-muted-foreground italic flex items-center gap-1.5">
            <Paperclip className="size-3.5" /> Nenhum anexo.
          </li>
        )}
      </ul>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.xls,.xlsx,.csv,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif"
        multiple
        onChange={async (e) => {
          const list = e.target.files;
          if (!list) return;
          for (const f of Array.from(list)) await addAttachment(taskId, f);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="size-3.5 mr-1.5" /> Anexar arquivo
      </Button>
      <p className="text-[11px] text-muted-foreground">
        Armazenamento local. Pronto para integração futura com Supabase Storage.
      </p>
    </div>
  );
}
