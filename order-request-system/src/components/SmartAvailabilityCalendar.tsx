import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";

interface SmartAvailabilityCalendarProps {
  selectedDates: Date[];
  onSelect: (dates: Date[] | undefined) => void;
}

export const SmartAvailabilityCalendar = ({ selectedDates, onSelect }: SmartAvailabilityCalendarProps) => {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border bg-card">
        <Calendar
          mode="multiple"
          selected={selectedDates}
          onSelect={onSelect}
          className="rounded-md"
          locale={ptBR}
        />
      </div>
      <p className="text-xs text-muted-foreground px-1">
        Toque nos dias para marcar como <span className="text-destructive font-medium">indisponível</span>.
        Eles não aparecerão nas buscas dos contratantes.
      </p>
    </div>
  );
};
