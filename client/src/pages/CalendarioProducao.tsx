import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Calendar as CalendarIcon,
  Factory,
  Clock,
  Users,
  Package,
} from "lucide-react";

type CalendarEvent = {
  id: number;
  date: string;
  title: string;
  type: "producao" | "manutencao" | "treinamento" | "reuniao";
  shift?: string;
  skuId?: number;
  quantity?: number;
  notes?: string;
};

const eventTypeColors: Record<string, string> = {
  producao: "bg-green-500",
  manutencao: "bg-orange-500",
  treinamento: "bg-blue-500",
  reuniao: "bg-purple-500",
};

const eventTypeLabels: Record<string, string> = {
  producao: "Produção",
  manutencao: "Manutenção",
  treinamento: "Treinamento",
  reuniao: "Reunião",
};

export default function CalendarioProducao() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([
    // Eventos de exemplo
    { id: 1, date: "2026-01-29", title: "Produção Coco Seco", type: "producao", shift: "A", quantity: 500 },
    { id: 2, date: "2026-01-29", title: "Manutenção Preventiva", type: "manutencao" },
    { id: 3, date: "2026-01-30", title: "Produção Coco Ralado", type: "producao", shift: "B", quantity: 300 },
    { id: 4, date: "2026-01-31", title: "Treinamento NR-12", type: "treinamento" },
    { id: 5, date: "2026-02-03", title: "Reunião Planejamento", type: "reuniao" },
    { id: 6, date: "2026-02-05", title: "Produção Leite de Coco", type: "producao", shift: "A", quantity: 400 },
  ]);

  const [newEvent, setNewEvent] = useState({
    title: "",
    type: "producao",
    date: "",
    shift: "",
    quantity: "",
    notes: "",
  });

  const { data: skus } = trpc.skus.list.useQuery({});
  const { data: productionOrders } = trpc.production.orders.list.useQuery({});

  // Funções do calendário
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  const handleCreateEvent = () => {
    if (!newEvent.title || !newEvent.date) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    const newId = Math.max(...events.map(e => e.id), 0) + 1;
    setEvents([...events, {
      id: newId,
      title: newEvent.title,
      type: newEvent.type as CalendarEvent["type"],
      date: newEvent.date,
      shift: newEvent.shift,
      quantity: newEvent.quantity ? parseInt(newEvent.quantity) : undefined,
      notes: newEvent.notes,
    }]);

    toast.success("Evento criado com sucesso!");
    setShowNewEventModal(false);
    setNewEvent({ title: "", type: "producao", date: "", shift: "", quantity: "", notes: "" });
  };

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const today = new Date();
  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentDate.getMonth() && 
           today.getFullYear() === currentDate.getFullYear();
  };

  // Calcular estatísticas do mês
  const monthEvents = events.filter(e => {
    const eventDate = new Date(e.date);
    return eventDate.getMonth() === currentDate.getMonth() && 
           eventDate.getFullYear() === currentDate.getFullYear();
  });

  const productionEvents = monthEvents.filter(e => e.type === "producao");
  const totalQuantity = productionEvents.reduce((sum, e) => sum + (e.quantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Calendário de Produção
          </h1>
          <p className="text-muted-foreground">
            Planejamento e visualização das atividades de produção
          </p>
        </div>
        <Dialog open={showNewEventModal} onOpenChange={setShowNewEventModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Evento</DialogTitle>
              <DialogDescription>
                Adicione um novo evento ao calendário de produção
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Produção Coco Seco"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select
                    value={newEvent.type}
                    onValueChange={(v) => setNewEvent({ ...newEvent, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="producao">Produção</SelectItem>
                      <SelectItem value="manutencao">Manutenção</SelectItem>
                      <SelectItem value="treinamento">Treinamento</SelectItem>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
              </div>
              {newEvent.type === "producao" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Turno</Label>
                    <Select
                      value={newEvent.shift}
                      onValueChange={(v) => setNewEvent({ ...newEvent, shift: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Turno A (06h-14h)</SelectItem>
                        <SelectItem value="B">Turno B (14h-22h)</SelectItem>
                        <SelectItem value="C">Turno C (22h-06h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade (kg)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newEvent.quantity}
                      onChange={(e) => setNewEvent({ ...newEvent, quantity: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Notas adicionais..."
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewEventModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateEvent}>
                Criar Evento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas do Mês */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos do Mês</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthEvents.length}</div>
            <p className="text-xs text-muted-foreground">
              {productionEvents.length} de produção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produção Planejada</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()} kg</div>
            <p className="text-xs text-muted-foreground">
              Meta do mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manutenções</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthEvents.filter(e => e.type === "manutencao").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Preventivas agendadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Treinamentos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monthEvents.filter(e => e.type === "treinamento").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Capacitações planejadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendário */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-xl">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </CardTitle>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {Object.entries(eventTypeLabels).map(([type, label]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${eventTypeColors[type]}`} />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Cabeçalho dos dias */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Grid do calendário */}
          <div className="grid grid-cols-7 gap-1">
            {/* Dias vazios antes do primeiro dia do mês */}
            {Array.from({ length: startingDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[100px] bg-muted/30 rounded-lg" />
            ))}

            {/* Dias do mês */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              const isTodayDay = isToday(day);

              return (
                <div
                  key={day}
                  className={`min-h-[100px] border rounded-lg p-2 cursor-pointer hover:bg-accent/50 transition-colors ${
                    isTodayDay ? "border-primary bg-primary/5" : "border-border"
                  }`}
                  onClick={() => {
                    setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                    setNewEvent({
                      ...newEvent,
                      date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                    });
                  }}
                >
                  <div className={`text-sm font-medium mb-1 ${isTodayDay ? "text-primary" : ""}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded ${eventTypeColors[event.type]} text-white truncate`}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Eventos do Dia Selecionado */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Eventos de {selectedDate.toLocaleDateString("pt-BR")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
              const dayEvents = events.filter(e => e.date === dateStr);

              if (dayEvents.length === 0) {
                return (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum evento para este dia
                  </p>
                );
              }

              return (
                <div className="space-y-3">
                  {dayEvents.map(event => (
                    <div key={event.id} className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${eventTypeColors[event.type]}`} />
                      <div className="flex-1">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {eventTypeLabels[event.type]}
                          {event.shift && ` • Turno ${event.shift}`}
                          {event.quantity && ` • ${event.quantity} kg`}
                        </p>
                      </div>
                      <Badge variant="secondary">{eventTypeLabels[event.type]}</Badge>
                    </div>
                  ))}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
