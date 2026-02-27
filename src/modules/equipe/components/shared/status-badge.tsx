import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  ativo: boolean;
};

export function StatusBadge({ ativo }: StatusBadgeProps) {
  return (
    <Badge variant={ativo ? "success" : "secondary"} dot>
      {ativo ? "Ativo" : "Inativo"}
    </Badge>
  );
}
