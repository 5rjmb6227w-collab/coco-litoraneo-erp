/**
 * ChatPanel - Interface de chat com o Copiloto IA
 */

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Bot, 
  User, 
  Copy, 
  Check, 
  Loader2, 
  MessageSquarePlus,
  Trash2,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Streamdown } from "streamdown";

interface Message {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
  tokensUsed?: number | null;
  sourceIds?: unknown;
}

interface Conversation {
  id: number;
  title: string;
  updatedAt: Date;
}

export function ChatPanel() {
  const [input, setInput] = useState("");
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showSources, setShowSources] = useState(false);
  const [selectedSources, setSelectedSources] = useState<number[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const conversationsQuery = trpc.ai.listConversations.useQuery({});
  const messagesQuery = trpc.ai.getMessages.useQuery(
    { conversationId: activeConversationId!, limit: 50 },
    { enabled: !!activeConversationId }
  );

  // Mutations
  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: () => {
      messagesQuery.refetch();
      conversationsQuery.refetch();
    },
    onError: (error) => {
      toast.error("Erro ao enviar mensagem: " + error.message);
    },
  });

  const createConversationMutation = trpc.ai.createConversation.useMutation({
    onSuccess: (data) => {
      setActiveConversationId(data.id);
      conversationsQuery.refetch();
    },
  });

  const archiveConversationMutation = trpc.ai.archiveConversation.useMutation({
    onSuccess: () => {
      setActiveConversationId(null);
      conversationsQuery.refetch();
      toast.success("Conversa arquivada");
    },
  });

  const feedbackMutation = trpc.ai.submitFeedback.useMutation({
    onSuccess: () => {
      toast.success("Feedback enviado!");
    },
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesQuery.data]);

  // Handlers
  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const message = input.trim();
    setInput("");

    await chatMutation.mutateAsync({
      message,
      conversationId: activeConversationId || undefined,
    });

    // Se não tinha conversa, pegar a nova
    if (!activeConversationId) {
      conversationsQuery.refetch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string, id: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleNewConversation = () => {
    createConversationMutation.mutate({});
  };

  const handleArchive = () => {
    if (activeConversationId) {
      archiveConversationMutation.mutate({ conversationId: activeConversationId });
    }
  };

  const handleViewSources = (sourceIds: number[]) => {
    setSelectedSources(sourceIds);
    setShowSources(true);
  };

  const conversations = conversationsQuery.data || [];
  const messages = messagesQuery.data || [];

  // Seleciona primeira conversa se nenhuma ativa
  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  return (
    <div className="flex h-[calc(100vh-220px)] gap-4">
      {/* Sidebar de conversas */}
      <div className="w-64 flex-shrink-0 hidden lg:flex flex-col">
        <Button 
          onClick={handleNewConversation} 
          className="mb-3 gap-2 bg-amber-600 hover:bg-amber-700"
          disabled={createConversationMutation.isPending}
        >
          <MessageSquarePlus className="h-4 w-4" />
          Nova Conversa
        </Button>

        <ScrollArea className="flex-1">
          <div className="space-y-1 pr-2">
            {conversationsQuery.isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-4">
                Nenhuma conversa ainda
              </p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConversationId(conv.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    activeConversationId === conv.id
                      ? "bg-amber-100 text-amber-900"
                      : "hover:bg-stone-100 text-stone-700"
                  )}
                >
                  <div className="truncate font-medium">{conv.title}</div>
                  <div className="text-xs text-stone-500">
                    {new Date(conv.updatedAt).toLocaleDateString("pt-BR")}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Área principal do chat */}
      <Card className="flex-1 flex flex-col">
        {/* Header do chat */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-stone-800">
              {activeConversationId 
                ? conversations.find(c => c.id === activeConversationId)?.title || "Chat"
                : "Nova Conversa"
              }
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Dropdown de conversas (mobile) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="lg:hidden">
                <Button variant="outline" size="sm" className="gap-1">
                  Conversas
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleNewConversation}>
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Nova Conversa
                </DropdownMenuItem>
                {conversations.map((conv) => (
                  <DropdownMenuItem 
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                  >
                    {conv.title}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {activeConversationId && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleArchive}
                disabled={archiveConversationMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-stone-500" />
              </Button>
            )}
          </div>
        </div>

        {/* Mensagens */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messagesQuery.isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto text-amber-300 mb-4" />
                <h3 className="text-lg font-medium text-stone-700 mb-2">
                  Olá! Sou o Copiloto IA
                </h3>
                <p className="text-sm text-stone-500 max-w-md mx-auto">
                  Posso ajudar com informações sobre produção, estoque, pagamentos, 
                  qualidade e muito mais. Como posso ajudar?
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {[
                    "Qual o resumo de hoje?",
                    "Tem pagamentos atrasados?",
                    "Como está o estoque?",
                    "Quais NCs estão abertas?",
                  ].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCopy={() => handleCopy(msg.content, msg.id)}
                  isCopied={copiedId === msg.id}
                  onViewSources={Array.isArray(msg.sourceIds) && msg.sourceIds.length > 0 ? () => handleViewSources(msg.sourceIds as number[]) : undefined}
                  onFeedback={(type) => feedbackMutation.mutate({ messageId: msg.id, feedbackType: type })}
                />
              ))
            )}

            {chatMutation.isPending && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 rounded-full">
                  <Bot className="h-4 w-4 text-amber-700" />
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Pensando...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta..."
              disabled={chatMutation.isPending}
              className="flex-1"
            />
            <Button 
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de fontes */}
      <Dialog open={showSources} onOpenChange={setShowSources}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evidências</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedSources.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhuma evidência disponível</p>
            ) : (
              selectedSources.map((sourceId) => (
                <div key={sourceId} className="flex items-center justify-between p-2 bg-stone-50 rounded">
                  <span className="text-sm">Registro #{sourceId}</span>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Componente de bolha de mensagem
interface MessageBubbleProps {
  message: Message;
  onCopy: () => void;
  isCopied: boolean;
  onViewSources?: () => void;
  onFeedback: (type: "like" | "dislike") => void;
}

function MessageBubble({ message, onCopy, isCopied, onViewSources, onFeedback }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "p-2 rounded-full flex-shrink-0",
        isUser ? "bg-stone-200" : "bg-amber-100"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-stone-600" />
        ) : (
          <Bot className="h-4 w-4 text-amber-700" />
        )}
      </div>

      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser && "flex flex-col items-end"
      )}>
        <div className={cn(
          "rounded-lg px-4 py-2",
          isUser 
            ? "bg-amber-600 text-white" 
            : "bg-stone-100 text-stone-800"
        )}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-stone max-w-none">
              <Streamdown>{message.content}</Streamdown>
            </div>
          )}
        </div>

        {/* Ações da mensagem */}
        {!isUser && (
          <div className="flex items-center gap-1 mt-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={onCopy}
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3 text-stone-400" />
              )}
            </Button>
            
            {onViewSources && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={onViewSources}
              >
                Ver evidências
              </Button>
            )}

            <div className="flex gap-1 ml-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => onFeedback("like")}
              >
                <span className="text-sm">👍</span>
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7"
                onClick={() => onFeedback("dislike")}
              >
                <span className="text-sm">👎</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
