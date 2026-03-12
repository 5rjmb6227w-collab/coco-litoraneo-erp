import { useState, useRef, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Loader2, MessageSquare, BookOpen, Send, AtSign } from 'lucide-react';
import { toast } from 'sonner';

interface TaskSidebarProps {
  taskId: number;
  projectId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface MentionItem {
  userId: number;
  name: string;
}

export default function TaskSidebar({ taskId, projectId, isOpen, onClose }: TaskSidebarProps) {
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<string>('observacao');
  const [newComment, setNewComment] = useState('');
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

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

  const { data: comments } = trpc.strategic.tasks.getComments.useQuery(
    { taskId },
    { enabled: isOpen && taskId > 0 }
  );

  const { data: members } = trpc.strategic.members.list.useQuery(
    { projectId },
    { enabled: isOpen && projectId > 0 }
  );

  const updateTask = trpc.strategic.tasks.update.useMutation();
  const createNote = trpc.strategic.tasks.createNote.useMutation();
  const createComment = trpc.strategic.tasks.createComment.useMutation();
  const deleteComment = trpc.strategic.tasks.deleteComment.useMutation();
  const deleteTask = trpc.strategic.tasks.delete.useMutation();
  const utils = trpc.useUtils();

  const filteredMembers = useMemo(() => {
    if (!members || !mentionFilter) return members || [];
    return (members as any[]).filter((m: any) =>
      (m.userName || m.name || '').toLowerCase().includes(mentionFilter.toLowerCase())
    );
  }, [members, mentionFilter]);

  const handleCommentChange = (value: string) => {
    setNewComment(value);
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const afterAt = value.substring(lastAtIndex + 1);
      const hasSpace = afterAt.includes(' ');
      if (!hasSpace && afterAt.length <= 20) {
        setShowMentionList(true);
        setMentionFilter(afterAt);
      } else {
        setShowMentionList(false);
      }
    } else {
      setShowMentionList(false);
    }
  };

  const handleSelectMention = (member: any) => {
    const memberName = member.userName || member.name || 'Usuário';
    const lastAtIndex = newComment.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const before = newComment.substring(0, lastAtIndex);
      setNewComment(before + '@' + memberName + ' ');
    }
    setShowMentionList(false);
    commentInputRef.current?.focus();
  };

  const extractMentions = (text: string): MentionItem[] => {
    const mentionRegex = /@(\S+)/g;
    const mentions: MentionItem[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      const name = match[1];
      const member = (members as any[] || []).find(
        (m: any) => (m.userName || m.name || '') === name
      );
      if (member) {
        mentions.push({ userId: member.userId || member.id, name });
      }
    }
    return mentions;
  };

  const handleUpdateField = async (field: string, value: any) => {
    try {
      await updateTask.mutateAsync({ id: taskId, [field]: value });
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      const mentions = extractMentions(newComment);
      await createComment.mutateAsync({
        taskId,
        projectId,
        content: newComment,
        mentions: mentions.length > 0 ? mentions : undefined,
      });
      utils.strategic.tasks.getComments.invalidate({ taskId });
      setNewComment('');
      toast.success('Comentário adicionado');
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      toast.error('Erro ao criar comentário');
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment.mutateAsync({ id: commentId });
      utils.strategic.tasks.getComments.invalidate({ taskId });
      toast.success('Comentário removido');
    } catch (error) {
      console.error('Erro ao excluir comentário:', error);
      toast.error('Erro ao excluir comentário');
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

  const renderCommentContent = (content: string) => {
    const parts = content.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span key={i} className="text-[#8B7355] font-semibold bg-[#8B7355]/10 rounded px-0.5">
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto">
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
                rows={3}
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

            {/* Tabs: Comentários e Diário de Bordo */}
            <Tabs defaultValue="comments" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="comments" className="gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comentários
                  {comments && (comments as any[]).length > 0 && (
                    <span className="ml-1 text-xs bg-[#8B7355]/20 text-[#8B7355] rounded-full px-1.5">
                      {(comments as any[]).length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Diário de Bordo
                  {notes && (notes as any[]).length > 0 && (
                    <span className="ml-1 text-xs bg-[#8B7355]/20 text-[#8B7355] rounded-full px-1.5">
                      {(notes as any[]).length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Comentários Tab */}
              <TabsContent value="comments" className="mt-4 space-y-4">
                {/* Input de novo comentário */}
                <div className="relative">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 relative">
                      <Textarea
                        ref={commentInputRef}
                        value={newComment}
                        onChange={(e) => handleCommentChange(e.target.value)}
                        placeholder="Escreva um comentário... Use @ para mencionar"
                        rows={2}
                        className="pr-10 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment();
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 bottom-1 h-7 w-7 text-[#8B7355] hover:text-[#5D4E37]"
                        onClick={() => {
                          setNewComment(prev => prev + '@');
                          setShowMentionList(true);
                          setMentionFilter('');
                          commentInputRef.current?.focus();
                        }}
                        title="Mencionar membro"
                      >
                        <AtSign className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      size="icon"
                      className="bg-[#8B7355] hover:bg-[#5D4E37] shrink-0 mt-0"
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || createComment.isPending}
                    >
                      {createComment.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Dropdown de menções */}
                  {showMentionList && filteredMembers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredMembers.map((member: any) => (
                        <button
                          key={member.id || member.userId}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                          onClick={() => handleSelectMention(member)}
                        >
                          <div className="w-6 h-6 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-xs font-medium text-[#8B7355]">
                            {(member.userName || member.name || '?')[0]?.toUpperCase()}
                          </div>
                          <span>{member.userName || member.name || 'Usuário'}</span>
                          <span className="text-xs text-muted-foreground ml-auto capitalize">{member.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lista de comentários */}
                {(!comments || (comments as any[]).length === 0) ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum comentário ainda</p>
                    <p className="text-xs mt-1">Seja o primeiro a comentar nesta tarefa</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(comments as any[]).map((comment: any) => (
                      <div key={comment.id} className="group p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#8B7355]/20 flex items-center justify-center text-xs font-medium text-[#8B7355]">
                              {(comment.authorName || '?')[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">{comment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {comment.createdAt ? new Date(comment.createdAt).toLocaleString('pt-BR', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                              }) : ''}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm leading-relaxed pl-8">
                          {renderCommentContent(comment.content)}
                        </p>
                        {comment.mentions && (comment.mentions as any[]).length > 0 && (
                          <div className="flex gap-1 mt-2 pl-8">
                            {(comment.mentions as any[]).map((m: any, i: number) => (
                              <span key={i} className="text-xs bg-[#8B7355]/10 text-[#8B7355] rounded px-1.5 py-0.5">
                                @{m.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Diário de Bordo Tab */}
              <TabsContent value="notes" className="mt-4 space-y-4">
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

                {(!notes || (notes as any[]).length === 0) ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma nota registrada</p>
                    <p className="text-xs mt-1">Registre observações, decisões e mudanças</p>
                  </div>
                ) : (
                  (notes as any[]).map((note: any) => (
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
                  ))
                )}
              </TabsContent>
            </Tabs>

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
