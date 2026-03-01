"use client";

import { useState } from "react";
import { SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  disabled?: boolean;
  sending?: boolean;
  onSend: (text: string) => Promise<void>;
};

export function WhatsappMessageInput({ disabled, sending, onSend }: Props) {
  const [text, setText] = useState("");

  return (
    <form
      className="sticky bottom-0 border-t border-slate-200 bg-white p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!text.trim() || disabled || sending) return;
        const content = text;
        setText("");
        await onSend(content);
      }}
    >
      <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1.5 pr-1">
        <input
          className="h-9 flex-1 bg-transparent px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Digite uma mensagem..."
          value={text}
          disabled={disabled}
          onChange={(event) => setText(event.target.value)}
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || sending || !text.trim()}
          className="h-9 w-9 rounded-full bg-emerald-600 text-white hover:scale-105 hover:bg-emerald-700 active:scale-95"
        >
          <SendHorizonal className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
