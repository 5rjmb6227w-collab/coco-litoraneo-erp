import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/FileUpload";

interface EditProjectModalProps {
  project: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => Promise<void>;
}

export default function EditProjectModal({ project, open, onOpenChange, onSave }: EditProjectModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "equipamento" as string,
    priority: "media" as string,
    status: "planejamento" as string,
    budgetPlanned: "",
    startDate: "",
    targetEndDate: "",
    photoUrl: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project && open) {
      setFormData({
        title: project.title || "",
        description: project.description || "",
        category: project.category || "equipamento",
        priority: project.priority || "media",
        status: project.status || "planejamento",
        budgetPlanned: project.budgetPlanned ? String(project.budgetPlanned) : "",
        startDate: project.startDate ? new Date(project.startDate).toISOString().split("T")[0] : "",
        targetEndDate: project.targetEndDate ? new Date(project.targetEndDate).toISOString().split("T")[0] : "",
        photoUrl: project.photoUrl || "",
      });
    }
  }, [project, open]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        id: project.id,
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        budgetPlanned: formData.budgetPlanned || null,
        startDate: formData.startDate || null,
        targetEndDate: formData.targetEndDate || null,
        photoUrl: formData.photoUrl || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Nome do projeto" />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descrição detalhada do projeto" rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                  <SelectItem value="obra">Obra</SelectItem>
                  <SelectItem value="insumo">Insumo</SelectItem>
                  <SelectItem value="processo">Processo</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejamento">Planejamento</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="pausado">Pausado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Orçamento Previsto (R$)</Label>
              <Input type="number" value={formData.budgetPlanned} onChange={(e) => setFormData({ ...formData, budgetPlanned: e.target.value })} placeholder="0.00" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim Prevista</Label>
              <Input type="date" value={formData.targetEndDate} onChange={(e) => setFormData({ ...formData, targetEndDate: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Foto de Capa</Label>
            <FileUpload
              folder="geral"
              onUploadComplete={(result) => setFormData({ ...formData, photoUrl: result.url })}
              currentFileUrl={formData.photoUrl}
              accept="image/*"
              label="Foto de capa do projeto"
              compact
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button className="bg-[#8B7355] hover:bg-[#5D4E37]" onClick={handleSave} disabled={saving || !formData.title.trim()}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
