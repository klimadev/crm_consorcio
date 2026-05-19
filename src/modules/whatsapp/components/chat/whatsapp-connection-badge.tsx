import type { ChatConnectionStatus } from "@/modules/whatsapp/types";

type Props = {
  status: ChatConnectionStatus;
};

export function WhatsappConnectionBadge({ status }: Props) {
  const online = status === "online";
  const degraded = status === "degraded";
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          online ? "bg-success" : degraded ? "bg-warning animate-pulse" : "bg-destructive"
        }`}
      />
      {online ? "Ativo" : degraded ? "Instavel" : "Offline"}
    </span>
  );
}
