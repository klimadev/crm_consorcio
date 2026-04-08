"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Paperclip, Smile, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  sending?: boolean;
  onSend: (text: string) => Promise<void>;
};

export function WhatsappMessageInput({ disabled, sending, onSend }: Props) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || disabled || sending) return;
    const content = text;
    setText("");
    await onSend(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      className="flex items-center gap-2 border-t border-border bg-background-surface px-3 py-2.5"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-foreground-muted hover:bg-muted hover:text-foreground"
          disabled={disabled}
          aria-label="Adicionar emoji"
        >
          <Smile className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-foreground-muted hover:bg-muted hover:text-foreground"
          disabled={disabled}
          aria-label="Anexar arquivo"
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-1 items-center rounded-[20px] border border-border bg-muted px-4 py-2 transition-all focus-within:border-ring focus-within:shadow-md">
        <input
          ref={inputRef}
          className="min-h-[20px] max-h-[100px] flex-1 bg-transparent text-sm text-foreground placeholder:text-foreground-disabled focus:outline-none"
          placeholder="Digite uma mensagem..."
          aria-label="Digite uma mensagem"
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {text.trim() ? (
        <Button
          type="submit"
          size="icon"
          disabled={disabled || sending || !text.trim()}
          className="h-10 w-10 rounded-full bg-success text-success-foreground hover:bg-success/90 active:scale-95 transition-all shadow-sm"
          aria-label="Enviar mensagem"
        >
          <Send className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          disabled={disabled}
          className="h-10 w-10 rounded-full text-foreground-muted hover:bg-muted"
          aria-label="Gravar áudio"
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}
    </form>
  );
}
