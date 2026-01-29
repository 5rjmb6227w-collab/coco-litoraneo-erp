import { useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type ShortcutAction = {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
};

export function useKeyboardShortcuts() {
  const [, navigate] = useLocation();

  const shortcuts: ShortcutAction[] = [
    // Navegação rápida com números (1-9)
    { key: "1", description: "Ir para Dashboard", action: () => navigate("/") },
    { key: "2", description: "Ir para Recebimento", action: () => navigate("/recebimento") },
    { key: "3", description: "Ir para Produção", action: () => navigate("/producao/apontamentos") },
    { key: "4", description: "Ir para Financeiro", action: () => navigate("/financeiro") },
    { key: "5", description: "Ir para Estoque", action: () => navigate("/estoque") },
    { key: "6", description: "Ir para Qualidade", action: () => navigate("/qualidade/analises") },
    { key: "7", description: "Ir para Custos", action: () => navigate("/custos") },
    { key: "8", description: "Ir para Relatórios", action: () => navigate("/relatorios") },
    { key: "9", description: "Ir para Copiloto IA", action: () => navigate("/copiloto") },
    
    // Atalhos com Alt
    { key: "n", alt: true, description: "Nova Carga", action: () => navigate("/recebimento") },
    { key: "p", alt: true, description: "Novo Apontamento", action: () => navigate("/producao/apontamentos") },
    { key: "c", alt: true, description: "Nova Compra", action: () => navigate("/compras") },
    { key: "r", alt: true, description: "Relatórios", action: () => navigate("/relatorios") },
    
    // Atalhos com Ctrl
    { key: "k", ctrl: true, description: "Busca Rápida", action: () => {
      // Dispara o evento de busca global (CommandPalette)
      const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true });
      document.dispatchEvent(event);
    }},
    { key: "h", ctrl: true, description: "Ir para Home", action: () => navigate("/") },
    
    // Atalhos com Shift
    { key: "?", shift: true, description: "Mostrar Atalhos", action: () => {
      toast.info(
        <div className="space-y-2">
          <p className="font-bold">Atalhos de Teclado</p>
          <div className="text-xs space-y-1">
            <p><kbd className="bg-muted px-1 rounded">1-9</kbd> Navegação rápida</p>
            <p><kbd className="bg-muted px-1 rounded">Alt+N</kbd> Nova Carga</p>
            <p><kbd className="bg-muted px-1 rounded">Alt+P</kbd> Novo Apontamento</p>
            <p><kbd className="bg-muted px-1 rounded">Ctrl+K</kbd> Busca Rápida</p>
            <p><kbd className="bg-muted px-1 rounded">Shift+?</kbd> Mostrar Atalhos</p>
          </div>
        </div>,
        { duration: 5000 }
      );
    }},
  ];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignorar se estiver em um input, textarea ou contenteditable
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [navigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

// Componente para exibir lista de atalhos
export function KeyboardShortcutsHelp() {
  const shortcuts = [
    { keys: "1-9", description: "Navegação rápida entre módulos" },
    { keys: "Alt + N", description: "Nova Carga" },
    { keys: "Alt + P", description: "Novo Apontamento de Produção" },
    { keys: "Alt + C", description: "Nova Solicitação de Compra" },
    { keys: "Alt + R", description: "Relatórios" },
    { keys: "Ctrl + K", description: "Busca Rápida" },
    { keys: "Ctrl + H", description: "Ir para Home" },
    { keys: "Shift + ?", description: "Mostrar Atalhos" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Atalhos de Teclado</h3>
      <div className="grid gap-2">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex items-center justify-between py-1 border-b border-border last:border-0">
            <span className="text-sm text-muted-foreground">{shortcut.description}</span>
            <kbd className="px-2 py-1 text-xs bg-muted rounded font-mono">{shortcut.keys}</kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
