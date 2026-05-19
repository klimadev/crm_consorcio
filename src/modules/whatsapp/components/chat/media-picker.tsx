"use client";

import { useRef, useState } from "react";
import { Image, Paperclip, X, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validarTamanhoArquivoCliente } from "@/lib/whatsapp-utils";
import { cn } from "@/lib/utils";

const FORMATOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
];

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  disabled?: boolean;
  sending?: boolean;
  onSend: (file: File, caption?: string) => Promise<void>;
  onCancel: () => void;
};

export function MediaPicker({ disabled, sending, onSend, onCancel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  const isImage = file?.type.startsWith("image/");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setErro(null);
    if (!f) return;

    if (!FORMATOS_PERMITIDOS.includes(f.type)) {
      setErro("Formato de arquivo nao suportado.");
      return;
    }

    const tipo = f.type.startsWith("image/") ? "IMAGEM" : "DOCUMENTO";
    const validacao = validarTamanhoArquivoCliente(f.size, tipo);
    if (!validacao.ok) {
      setErro(validacao.erro);
      return;
    }

    setFile(f);

    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleSend = async () => {
    if (!file || sending) return;
    await onSend(file, caption.trim() || undefined);
  };

  const handleCancel = () => {
    setFile(null);
    setPreview(null);
    setCaption("");
    setErro(null);
    onCancel();
  };

  if (!file) {
    return (
      <div className="flex items-center gap-2 border-t border-border bg-background-surface px-3 py-2.5">
        <input
          ref={fileInputRef}
          type="file"
          accept={FORMATOS_PERMITIDOS.join(",")}
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="gap-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="h-4 w-4" /> Imagem
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="gap-2 text-xs"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" /> Documento
        </Button>
        {erro && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" /> {erro}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-background-surface px-3 py-2.5">
      <div className="flex items-start gap-3">
        {preview ? (
          <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={file.name ?? "Pre-visualizacao"}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
            <Paperclip className="h-8 w-8 text-foreground-muted" />
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
            <span className="flex-shrink-0 text-xs text-foreground-muted">
              {formatarTamanho(file.size)}
            </span>
          </div>

          {isImage && (
            <input
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-foreground-disabled focus:outline-none focus:border-ring"
              placeholder="Adicionar legenda (opcional)..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={sending}
            />
          )}

          <div className="mt-1 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 rounded-md text-xs text-foreground-muted hover:text-foreground",
                sending && "pointer-events-none opacity-50",
              )}
              onClick={handleCancel}
              disabled={sending}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Cancelar
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              size="sm"
              className="h-7 rounded-md bg-success text-success-foreground hover:bg-success/90 text-xs"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? (
                <span className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground" />
                  Enviando...
                </span>
              ) : (
                <>
                  <Send className="mr-1 h-3.5 w-3.5" /> Enviar
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
