import { Database } from "@/types/database.types";

type Status = Database["public"]["Tables"]["matches"]["Row"]["status"];

 HEAD
const statusConfig: Record<string, { label: string; className: string }> = {

const statusConfig: Record<Status, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-primary/20 text-primary border-primary/40" },
  aceita: { label: "Aceita", className: "bg-success/20 text-success border-success/40" },
  a_caminho: { label: "A caminho", className: "bg-blue-500/20 text-blue-400 border-blue-500/40" },
  em_andamento: { label: "Em andamento", className: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
  finalizada: { label: "Finalizada", className: "bg-muted text-muted-foreground border-border" },
  cancelada: { label: "Cancelada", className: "bg-destructive/20 text-destructive border-destructive/40" },
};

// Configuração padrão para evitar crash se o status for inválido ou nulo
const fallbackConfig = { 
  label: "Desconhecido", 
  className: "bg-gray-500/20 text-gray-400 border-gray-500/40" 
};

export const StatusBadge = ({ status }: { status: Status }) => {
  // 1. Garantimos que 'status' seja tratado como string para a busca
  // 2. Usamos o fallback se o status for null ou não existir no mapeamento
  const config = (status && statusConfig[status]) || fallbackConfig;

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
};