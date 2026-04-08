import type { ChatConnectionStatus } from "@/modules/whatsapp/types";

type Props = {
  status: ChatConnectionStatus;
};

export function WhatsappConnectionBadge({ status }: Props) {
  const online = status === "online";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-success-foreground/90">
      <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-success" : "bg-destructive"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
