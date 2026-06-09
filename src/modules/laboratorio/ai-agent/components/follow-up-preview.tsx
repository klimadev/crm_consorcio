"use client";

import { Sparkles, MessageSquareOff } from "lucide-react";

type Props = {
  followUpMessage: string | null;
  leadName: string;
  rationale?: string;
};

export function FollowUpPreview({ followUpMessage, leadName, rationale }: Props) {
  if (!followUpMessage) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-muted/20 p-3">
        <MessageSquareOff className="h-4 w-4 text-foreground-muted shrink-0" />
        <p className="text-xs text-foreground-muted">
          Nenhum follow-up sugerido — lead frio
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
        <div className="absolute -top-2 right-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            <Sparkles className="h-3 w-3" />
            Personalizado
          </span>
        </div>
        <p className="text-sm text-foreground leading-relaxed pr-24">
          {followUpMessage}
        </p>
      </div>
      {rationale && (
        <p className="text-xs text-foreground-disabled leading-relaxed italic">
          {rationale}
        </p>
      )}
    </div>
  );
}
