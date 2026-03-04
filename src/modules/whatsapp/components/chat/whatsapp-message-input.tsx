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
      className="flex items-center gap-2 px-3 py-2.5 bg-[#f0f2f5]"
      onSubmit={handleSubmit}
    >
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-700"
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 flex items-center bg-white rounded-[20px] px-4 py-2 shadow-sm border border-transparent focus-within:border-[#00a884] focus-within:shadow-md transition-all">
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none min-h-[20px] max-h-[100px]"
          placeholder="Digite uma mensagem..."
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
          className="h-10 w-10 rounded-full bg-[#00a884] text-white hover:bg-[#008f6b] active:scale-95 transition-all shadow-sm"
        >
          <Send className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon"
          disabled={disabled}
          className="h-10 w-10 rounded-full text-slate-400 hover:bg-slate-200"
        >
          <Mic className="h-5 w-5" />
        </Button>
      )}
    </form>
  );
}
