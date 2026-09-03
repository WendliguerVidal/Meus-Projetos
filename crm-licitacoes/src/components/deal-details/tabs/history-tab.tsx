"use client";

import * as React from "react";
import { useNotes, useAddNote } from "@/hooks/use-deal-details";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, initials } from "@/lib/utils";
import { Send } from "lucide-react";

export function HistoryTab({ dealId }: { dealId: string }) {
  const { data: notes, isLoading } = useNotes(dealId);
  const { mutate: addNote, isPending } = useAddNote(dealId);
  const [text, setText] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addNote(text.trim(), { onSuccess: () => setText("") });
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreva uma observação sobre este processo..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={isPending || !text.trim()} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Adicionar Observação
          </Button>
        </div>
      </form>

      <div className="space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}

        {!isLoading && notes?.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma observação registrada ainda.</p>
        )}

        {notes?.map((note) => (
          <div key={note.id} className="flex gap-3 border-l-2 border-muted pl-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarFallback className="text-[10px]">{initials(note.user.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{note.user.name}</span>
                <span className="text-xs text-muted-foreground">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{note.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
