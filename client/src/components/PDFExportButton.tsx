/**
 * Botão de Exportação PDF
 * Componente reutilizável para exportar dashboards em PDF
 */

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export type ExportFormat = 'pdf' | 'csv' | 'excel';

interface PDFExportButtonProps {
  onExport: (format: ExportFormat) => Promise<void>;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showDropdown?: boolean;
}

export function PDFExportButton({
  onExport,
  label = 'Exportar',
  variant = 'outline',
  size = 'default',
  className = '',
  showDropdown = false,
}: PDFExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: ExportFormat = 'pdf') => {
    setIsExporting(true);
    try {
      await onExport(format);
      toast.success(`Relatório exportado com sucesso!`, {
        description: `Arquivo ${format.toUpperCase()} gerado e baixado.`,
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar relatório', {
        description: 'Tente novamente em alguns instantes.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (showDropdown) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={className}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            {label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleExport('pdf')}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport('csv')}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => handleExport('pdf')}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-2" />
      )}
      {label}
    </Button>
  );
}
