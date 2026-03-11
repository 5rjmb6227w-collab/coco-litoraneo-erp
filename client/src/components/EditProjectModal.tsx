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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileUpload } from '@/components/FileUpload';
import { Edit, Trash2 } from 'lucide-react';

interface EditProjectModalProps {
  projectId: string;
  onSuccess?: () => void;
}

export function EditProjectModal({ projectId, onSuccess }: EditProjectModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: '',
    status: '',
    startDate: '',
    endDate: '',
    budgetPlanned: 0,
    photoUrl: '',
  });

  const { data: project } = trpc.strategic.projects.getById.useQuery({ id: projectId });
  const updateProject = trpc.strategic.projects.update.useMutation();
  const deleteProject = trpc.strategic.projects.delete.useMutation();
  const utils = trpc.useUtils();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && project) {
      setFormData({
        title: project.title,
        description: project.description || '',
        category: project.category,
        priority: project.priority,
        status: project.status,
        startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
        endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
        budgetPlanned: project.budgetPlanned || 0,
        photoUrl: project.photoUrl || '',
      });
    }
  };

  const handleSave = async () => {
    try {
      await updateProject.mutateAsync({
        id: projectId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        startDate: formData.startDate ? new Date(formData.startDate).getTime() : undefined,
        endDate: formData.endDate ? new Date(formData.endDate).getTime() : undefined,
        budgetPlanned: formData.budgetPlanned,
        photoUrl: formData.photoUrl,
      });
      await utils.strategic.projects.getById.invalidate({ id: projectId });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Tem certeza que deseja cancelar este projeto? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      await deleteProject.mutateAsync({ id: projectId });
      await utils.strategic.projects.list.invalidate();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error canceling project:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" /> Editar Projeto
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Título */}
          <div>
            <label className="text-sm font-medium">Título *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-2"
              placeholder="Nome do projeto"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-2"
              rows={4}
              placeholder="Descrição detalhada do projeto"
            />
          </div>

          {/* Categoria e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Categoria *</label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Equipamento">Equipamento</SelectItem>
                  <SelectItem value="Obra">Obra</SelectItem>
                  <SelectItem value="Insumo">Insumo</SelectItem>
                  <SelectItem value="Processo">Processo</SelectItem>
                  <SelectItem value="Comercial">Comercial</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Prioridade *</label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione" />
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

          {/* Status */}
          <div>
            <label className="text-sm font-medium">Status *</label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planejamento">Planejamento</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="pausado">Pausado</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Data de Início</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Data de Término Prevista</label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          {/* Orçamento */}
          <div>
            <label className="text-sm font-medium">Orçamento Previsto (R$)</label>
            <Input
              type="number"
              value={formData.budgetPlanned}
              onChange={(e) => setFormData({ ...formData, budgetPlanned: parseFloat(e.target.value) || 0 })}
              className="mt-2"
              placeholder="0.00"
              step="0.01"
            />
          </div>

          {/* Foto de Capa */}
          <div>
            <label className="text-sm font-medium">Foto de Capa</label>
            <FileUpload
              onUpload={(url) => setFormData({ ...formData, photoUrl: url })}
              currentUrl={formData.photoUrl}
              accept="image/*"
            />
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleCancel}
            className="mr-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Cancelar Projeto
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Fechar
            </Button>
            <Button
              className="bg-[#8B7355] hover:bg-[#5D4E37]"
              onClick={handleSave}
              disabled={updateProject.isPending}
            >
              {updateProject.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
