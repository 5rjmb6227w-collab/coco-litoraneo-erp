'use client';

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
  SheetClose,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Trash2 } from 'lucide-react';

interface TaskSidebarProps {
  taskId: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskSidebar({ taskId, projectId, isOpen, onClose }: TaskSidebarProps) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');

  const { data: task, isLoading } = trpc.strategic.tasks.getById.useQuery({
    id: taskId,
  });

  const { data: notes } = trpc.strategic.tasks.getNotes.useQuery({
    taskId,
  });

  const { data: subtasks } = trpc.strategic.tasks.getSubtasks.useQuery({
    taskId,
  });

  const updateTask = trpc.strategic.tasks.update.useMutation();
  const createNote = trpc.strategic.taskNotes.create.useMutation();
  const deleteTask = trpc.strategic.tasks.delete.useMutation();
  const utils = trpc.useUtils();

  const handleUpdateField = async (field: string, value: any) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        [field]: value,
      });
      await utils.strategic.tasks.getById.invalidate({ id: taskId });
      setEditingField(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    try {
      await createNote.mutateAsync({
        taskId,
        content: newNote,
        type: 'Observacao',
      });
      await utils.strategic.tasks.getNotes.invalidate({ taskId });
      setNewNote('');
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    try {
      await deleteTask.mutateAsync({ id: taskId });
      await utils.strategic.tasks.list.invalidate({ projectId });
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  if (!task) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>{task.title}</SheetTitle>
            <SheetClose />
          </div>
        </SheetHeader>

        {isLoading ? (
          <div>Carregando...</div>
        ) : (
          <div className="space-y-6 mt-6">
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
                    <SelectItem value="Critica">Crítica</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Responsável */}
            <div>
              <label className="text-sm font-medium">Responsável</label>
              <Input
                className="mt-2"
                value={task.assigneeName || ''}
                onChange={(e) => handleUpdateField('assigneeName', e.target.value)}
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
                  value={task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleUpdateField('startDate', new Date(e.target.value).getTime())}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Prazo</label>
                <Input
                  type="date"
                  className="mt-2"
                  value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                  onChange={(e) => handleUpdateField('dueDate', new Date(e.target.value).getTime())}
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
                  value={task.estimatedHours || 0}
                  onChange={(e) => handleUpdateField('estimatedHours', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Horas Reais</label>
                <Input
                  type="number"
                  className="mt-2"
                  value={task.realHours || 0}
                  onChange={(e) => handleUpdateField('realHours', parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea
                className="mt-2"
                value={task.description || ''}
                onChange={(e) => handleUpdateField('description', e.target.value)}
                placeholder="Descrição da tarefa"
                rows={4}
              />
            </div>

            {/* Subtarefas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subtarefas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(subtasks || []).map((subtask) => (
                  <div key={subtask.id} className="flex items-center gap-2">
                    <input type="checkbox" className="w-4 h-4" />
                    <span className="text-sm">{subtask.title}</span>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Subtarefa
                </Button>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Adicionar nota..."
                    rows={3}
                  />
                  <Button
                    className="mt-2 w-full bg-[#8B7355] hover:bg-[#5D4E37]"
                    onClick={handleAddNote}
                  >
                    Adicionar Nota
                  </Button>
                </div>

                {(notes || []).map((note) => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded">
                    <p className="text-xs text-gray-600">
                      {note.authorName} • {note.createdAt ? new Date(note.createdAt).toLocaleString('pt-BR') : ''}
                    </p>
                    <p className="text-sm mt-2">{note.content}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Fechar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteTask}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
