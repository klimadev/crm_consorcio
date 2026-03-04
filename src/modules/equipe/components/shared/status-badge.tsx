import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  ativo: boolean;
};

export function StatusBadge({ ativo }: StatusBadgeProps) {
  return (
    <Badge 
      variant={ativo ? "success" : "secondary"} 
      dot 
      role="status" 
      aria-label={ativo ? "Status: Ativo" : "Status: Inativo"}
    >
      {ativo ? "Ativo" : "Inativo"}
    </Badge>
  );
}
