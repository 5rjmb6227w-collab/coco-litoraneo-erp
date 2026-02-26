import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Upload, X, FileIcon, ImageIcon, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type UploadFolder = "cargas" | "produtores" | "pagamentos" | "equipamentos" | "qualidade" | "documentos" | "compras" | "producao" | "geral";

interface FileUploadProps {
  folder: UploadFolder;
  entityType?: string;
  entityId?: number;
  onUploadComplete?: (result: { url: string; key: string; fileName: string; mimeType: string; size: number }) => void;
  accept?: string;
  maxSizeMB?: number;
  multiple?: boolean;
  maxFiles?: number;
  label?: string;
  currentFileUrl?: string;
  compact?: boolean;
}

interface FilePreview {
  file: File;
  preview: string | null;
  status: "pending" | "uploading" | "done" | "error";
  url?: string;
  error?: string;
}

const ALLOWED_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="w-5 h-5 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="w-5 h-5 text-red-500" />;
  return <FileIcon className="w-5 h-5 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({
  folder,
  entityType,
  entityId,
  onUploadComplete,
  accept,
  maxSizeMB = 16,
  multiple = false,
  maxFiles = 5,
  label = "Enviar arquivo",
  currentFileUrl,
  compact = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const uploadMutation = trpc.upload.uploadFile.useMutation({
    onSuccess: (data) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading" ? { ...f, status: "done" as const, url: data.url } : f
        )
      );
      onUploadComplete?.(data);
      toast.success(`${data.fileName} enviado com sucesso.`);
    },
    onError: (error) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.status === "uploading" ? { ...f, status: "error" as const, error: error.message } : f
        )
      );
      toast.error(error.message || "Erro no upload");
    },
  });

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return `Tipo não permitido: ${file.type}. Use imagens, PDF, Excel ou CSV.`;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        return `Arquivo excede ${maxSizeMB}MB.`;
      }
      return null;
    },
    [maxSizeMB]
  );

  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const newFiles: FilePreview[] = [];
      const filesToProcess = Array.from(fileList).slice(0, multiple ? maxFiles : 1);

      for (const file of filesToProcess) {
        const error = validateFile(file);
        if (error) {
          toast.error(error);
          continue;
        }

        const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
        newFiles.push({ file, preview, status: "pending" });
      }

      if (multiple) {
        setFiles((prev) => [...prev, ...newFiles].slice(0, maxFiles));
      } else {
        // Limpar previews anteriores
        files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
        setFiles(newFiles);
      }
    },
    [files, maxFiles, multiple, toast, validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        processFiles(e.target.files);
      }
    },
    [processFiles]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const uploadFiles = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    for (let i = 0; i < pendingFiles.length; i++) {
      const filePreview = pendingFiles[i];
      setFiles((prev) =>
        prev.map((f) => (f === filePreview ? { ...f, status: "uploading" as const } : f))
      );

      try {
        const base64 = await fileToBase64(filePreview.file);
        await uploadMutation.mutateAsync({
          fileName: filePreview.file.name,
          mimeType: filePreview.file.type,
          base64Data: base64,
          folder,
          entityType,
          entityId,
        });
      } catch {
        // Erro já tratado no onError do mutation
      }
    }
  }, [files, folder, entityType, entityId, uploadMutation]);

  const acceptTypes = accept || ALLOWED_TYPES.join(",");
  const hasPendingFiles = files.some((f) => f.status === "pending");
  const isUploading = files.some((f) => f.status === "uploading");

  if (compact) {
    return (
      <div className="flex flex-col gap-2">
        {currentFileUrl && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <a href={currentFileUrl} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px]">
              Arquivo atual
            </a>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptTypes}
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="w-4 h-4 mr-1" />
            {label}
          </Button>
          {files.length > 0 && (
            <div className="flex items-center gap-1 text-sm">
              {files[0].status === "uploading" && <Loader2 className="w-4 h-4 animate-spin" />}
              {files[0].status === "done" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
              {files[0].status === "pending" && (
                <Button type="button" size="sm" onClick={uploadFiles} disabled={isUploading}>
                  Enviar
                </Button>
              )}
              <span className="truncate max-w-[150px]">{files[0].file.name}</span>
              <button type="button" onClick={() => removeFile(0)} className="text-muted-foreground hover:text-destructive">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Área de drag-and-drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Arraste e solte ou clique para selecionar. Máx. {maxSizeMB}MB.
        </p>
        <p className="text-xs text-muted-foreground">
          Formatos: JPEG, PNG, WebP, GIF, PDF, Excel, CSV
        </p>
      </div>

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((filePreview, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 rounded-md border bg-muted/30"
            >
              {/* Preview ou ícone */}
              {filePreview.preview ? (
                <img
                  src={filePreview.preview}
                  alt={filePreview.file.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                  {getFileIcon(filePreview.file.type)}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{filePreview.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(filePreview.file.size)}
                  {filePreview.status === "done" && (
                    <span className="text-green-600 ml-2">Enviado</span>
                  )}
                  {filePreview.status === "uploading" && (
                    <span className="text-blue-600 ml-2">Enviando...</span>
                  )}
                  {filePreview.status === "error" && (
                    <span className="text-red-600 ml-2">Erro: {filePreview.error}</span>
                  )}
                </p>
              </div>

              {/* Status/Ações */}
              <div className="flex items-center gap-1">
                {filePreview.status === "uploading" && (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                )}
                {filePreview.status === "done" && (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                )}
                {(filePreview.status === "pending" || filePreview.status === "error") && (
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Botão de upload */}
          {hasPendingFiles && (
            <Button onClick={uploadFiles} disabled={isUploading} className="w-full">
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar {files.filter((f) => f.status === "pending").length} arquivo(s)
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Arquivo atual */}
      {currentFileUrl && files.length === 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md border bg-green-50 dark:bg-green-950/20">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <a
            href={currentFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 dark:text-green-400 underline truncate"
          >
            Ver arquivo atual
          </a>
        </div>
      )}
    </div>
  );
}

// Utilitário para converter File para base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remover o prefixo "data:...;base64,"
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
