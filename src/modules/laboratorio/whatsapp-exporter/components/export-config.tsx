"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";
import type { ExportConfig } from "../types";

type Props = {
  config: ExportConfig;
  onUpdate: (partial: Partial<ExportConfig>) => void;
  onExport: () => void;
  loading: boolean;
  disabled: boolean;
};

export function ExportConfigPanel({
  config,
  onUpdate,
  onExport,
  loading,
  disabled,
}: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="flex-1 space-y-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-foreground-muted">
          Chats a exportar
        </label>
        <Input
          type="number"
          min={1}
          max={1000}
          value={config.chatLimit}
          onChange={(e) =>
            onUpdate({ chatLimit: Math.max(1, Math.min(1000, Number(e.target.value) || 1)) })
          }
          disabled={loading}
          className="h-9"
        />
      </div>

      <div className="flex-1 space-y-1.5 min-w-[140px]">
        <label className="text-xs font-medium text-foreground-muted">
          Mensagens por chat
        </label>
        <Input
          type="number"
          min={1}
          max={100}
          value={config.messagesPerChat}
          onChange={(e) =>
            onUpdate({
              messagesPerChat: Math.max(1, Math.min(100, Number(e.target.value) || 1)),
            })
          }
          disabled={loading}
          className="h-9"
        />
      </div>

      <Button
        onClick={onExport}
        disabled={disabled || loading}
        size="default"
        className="h-9"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Exportar Chats
          </>
        )}
      </Button>
    </div>
  );
}
