import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TaskSidebarProps {
  taskId: number;
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskSidebar({ taskId, projectId, isOpen, onClose }: TaskSidebarProps) {
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<string>('observacao');

  const { data: task, isLoading } = trpc.strategic.tasks.getById.useQuery(
    { id: taskId },
    { enabled: isOpen && taskId > 0 }
  );

  const { data: notes } = trpc.strategic.tasks.getNotes.useQuery(
    { taskId },
    { enabled: isOpen && taskId > 0 }
  );

  const { data: subtasks } = trpc.strategic.tasks.getSubtasks.useQuery(
    { parentTaskId: taskId },
    { enabled: isOpen && taskId > 0 }
  );

  const updateTask = trpc.strategic.tasks.update.useMutation();
  const createNote = trpc.strategic.tasks.createNote.useMutation();
  const deleteTask = trpc.strategic.tasks.delete.useMutation();
  const utils = trpc.useUtils();

  const handleUpdateField = async (field: string, value: any) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        [field]: value,
      });
      utils.strategic.tasks.getById.invalidate({ id: taskId });
      utils.strategic.tasks.list.invalidate({ projectId });
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await createNote.mutateAsync({
        taskId,
        projectId,
        content: newNote,
        noteType: noteType as any,
      });
      utils.strategic.tasks.getNotes.invalidate({ taskId });
      setNewNote('');
      toast.success('Nota adicionada');
    } catch (error) {
      console.error('Erro ao criar nota:', error);
      toast.error('Erro ao criar nota');
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await deleteTask.mutateAsync({ id: taskId });
      utils.strategic.tasks.list.invalidate({ projectId });
      onClose();
      toast.success('Tarefa excluída');
    } catch (error) {
      console.error('Erro ao excluir tarefa:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{task?.title || 'Carregando...'}</SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B7355]" />
          </div>
        ) : task ? (
          <div className="space-y-6 mt-6">
            {/* Código */}
            <div className="text-sm text-muted-foreground">
              Código: <span className="font-mono font-medium">{task.code}</span>
            </div>

            {/* Status e Prioridade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={task.status}
                  onValueChange={(value) => handleUpdateField('status', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_fazer">A Fazer</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Prioridade</label>
                <Select
                  value={task.priority}
                  onValueChange={(value) => handleUpdateField('priority', value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critica">Crítica</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Responsável */}
            <div>
              <label className="text-sm font-medium">Responsável</label>
              <Input
                className="mt-2"
                defaultValue={task.assigneeName || ''}
                onBlur={(e) => handleUpdateField('assigneeName', e.target.value || null)}
                placeholder="Nome do responsável"
              />
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Data Início</label>
                <Input
                  type="date"
                  className="mt-2"
                  defaultValue={task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleUpdateField('startDate', e.target.value || null)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Prazo</label>
                <Input
                  type="date"
                  className="mt-2"
                  defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleUpdateField('dueDate', e.target.value || null)}
                />
              </div>
            </div>

            {/* Horas e Custos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Horas Estimadas</label>
                <Input
                  type="number"
                  className="mt-2"
                  defaultValue={task.estimatedHours || ''}
                  onBlur={(e) => handleUpdateField('estimatedHours', e.target.value || null)}
                  step="0.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Horas Reais</label>
                <Input
                  type="number"
                  className="mt-2"
                  defaultValue={task.actualHours || ''}
                  onBlur={(e) => handleUpdateField('actualHours', e.target.value || null)}
                  step="0.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Custo Estimado (R$)</label>
                <Input
                  type="number"
                  className="mt-2"
                  defaultValue={task.estimatedCost || ''}
                  onBlur={(e) => handleUpdateField('estimatedCost', e.target.value || null)}
                  step="0.01"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Custo Real (R$)</label>
                <Input
                  type="number"
                  className="mt-2"
                  defaultValue={task.actualCost || ''}
                  onBlur={(e) => handleUpdateField('actualCost', e.target.value || null)}
                  step="0.01"
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                className="mt-2"
                defaultValue={task.description || ''}
                onBlur={(e) => handleUpdateField('description', e.target.value || null)}
                placeholder="Descrição da tarefa"
                rows={4}
              />
            </div>

            {/* Subtarefas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Subtarefas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(subtasks || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma subtarefa</p>
                )}
                {(subtasks || []).map((subtask: any) => (
                  <div key={subtask.id} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300"
                      checked={subtask.status === 'concluida'}
                      readOnly
                    />
                    <span className={`text-sm ${subtask.status === 'concluida' ? 'line-through text-muted-foreground' : ''}`}>
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Notas / Diário de Bordo */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Diário de Bordo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Select value={noteType} onValueChange={setNoteType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo da nota" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="observacao">Observação</SelectItem>
                      <SelectItem value="decisao">Decisão</SelectItem>
                      <SelectItem value="problema">Problema</SelectItem>
                      <SelectItem value="mudanca">Mudança</SelectItem>
                      <SelectItem value="valor">Valor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Adicionar nota..."
                    rows={3}
                  />
                  <Button
                    className="w-full bg-[#8B7355] hover:bg-[#5D4E37]"
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Nota
                  </Button>
                </div>

                {(notes || []).map((note: any) => (
                  <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium capitalize px-2 py-0.5 rounded bg-[#8B7355]/10 text-[#8B7355]">
                        {note.noteType || 'observação'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {note.createdByName || 'Usuário'} • {note.createdAt ? new Date(note.createdAt).toLocaleString('pt-BR') : ''}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{note.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex gap-2 pb-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Fechar
              </Button>
              <Button
                variant="destructive"
                size="icon"
                onClick={handleDeleteTask}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Tarefa não encontrada
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
