import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function TaskComments({ taskId }: { taskId: string }) {
  const { getCommentsByTask, addComment, deleteComment } = useStore();
  const comments = getCommentsByTask(taskId);
  const [text, setText] = useState("");

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {comments.map((c) => (
          <li key={c.id} className="glass rounded-lg p-3 flex items-start gap-2 group">
            <div className="flex-1 min-w-0">
              <div className="text-sm whitespace-pre-wrap">{c.text}</div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {format(parseISO(c.createdAt), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>
            <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
        {comments.length === 0 && <li className="text-xs text-muted-foreground italic">Sem comentários.</li>}
      </ul>
      <div className="flex gap-2">
        <Textarea placeholder="Adicionar comentário..." value={text} onChange={(e) => setText(e.target.value)} rows={2} />
        <Button
          onClick={() => {
            if (!text.trim()) return;
            addComment(taskId, text.trim());
            setText("");
          }}
        >
          Enviar
        </Button>
      </div>
    </div>
  );
}
