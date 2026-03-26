import { Database } from "@/types/database.types";

type Status = Database["public"]["Tables"]["matches"]["Row"]["status"];

const statusConfig: Record<Status, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-primary/20 text-primary border-primary/40" },
  aceita: { label: "Aceita", className: "bg-success/20 text-success border-success/40" },
  a_caminho: { label: "A caminho", className: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  em_andamento: { label: "Em andamento", className: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  finalizada: { label: "Finalizada", className: "bg-muted text-muted-foreground border-border" },
  cancelada: { label: "Cancelada", className: "bg-destructive/20 text-destructive border-destructive/40" },
};

export const StatusBadge = ({ status }: { status: Status }) => {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
};
