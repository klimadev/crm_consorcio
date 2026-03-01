import type { ChatConnectionStatus } from "@/modules/whatsapp/types";

type Props = {
  status: ChatConnectionStatus;
};

export function WhatsappConnectionBadge({ status }: Props) {
  const online = status === "online";
  return (
    <span className="inline-flex items-center gap-2 text-xs text-white/95">
      <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-500"}`} />
      {online ? "Online" : "Offline"}
    </span>
  );
}
