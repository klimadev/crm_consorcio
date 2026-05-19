"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Mic, Square, Play, Trash2, Send, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type RecordingState = "idle" | "recording" | "review";

function formatarTempo(segundos: number) {
  const min = Math.floor(segundos / 60);
  const sec = Math.floor(segundos % 60);
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function gerarWaveformBarras(duracaoMs: number): number[] {
  const barras = Math.min(Math.max(Math.floor(duracaoMs / 150), 8), 36);
  return Array.from({ length: barras }, () => 0.2 + Math.random() * 0.8);
}

const suporteMediaRecorder = typeof MediaRecorder !== "undefined";

type Props = {
  disabled?: boolean;
  sending?: boolean;
  onSend: (blob: Blob, duration: number) => Promise<void>;
  onCancel: () => void;
};

export function AudioRecorder({ disabled, sending, onSend, onCancel }: Props) {
  const [estado, setEstado] = useState<RecordingState>("idle");
  const [tempo, setTempo] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveformBarras, setWaveformBarras] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(
    suporteMediaRecorder ? null : "Seu navegador nao suporta gravacao de audio.",
  );

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inicioRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const limparTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const iniciarGravacao = useCallback(async () => {
    setErro(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setEstado("review");
        setWaveformBarras(gerarWaveformBarras(Date.now() - inicioRef.current));
      };

      recorder.start(250);
      inicioRef.current = Date.now();
      setEstado("recording");
      setTempo(0);

      timerRef.current = setInterval(() => {
        setTempo((prev) => {
          const next = prev + 1;
          if (next >= 300) {
            recorder.stop();
            limparTimer();
            return 300;
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      const mensagem = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Permissao de microfone negada. Verifique as configuracoes do navegador."
        : "Erro ao acessar o microfone.";
      setErro(mensagem);
    }
  }, [limparTimer]);

  const pararGravacao = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    limparTimer();
  }, [limparTimer]);

  const handleEnviar = useCallback(async () => {
    if (!audioBlob || sending) return;
    const duracao = Math.ceil((audioBlob.size > 0 ? tempo : 0) || 1);
    await onSend(audioBlob, duracao);
  }, [audioBlob, sending, tempo, onSend]);

  const handleCancelar = useCallback(() => {
    limparTimer();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setEstado("idle");
    setTempo(0);
    setErro(null);
    onCancel();
  }, [limparTimer, audioUrl, onCancel]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !audioUrl) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      limparTimer();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [limparTimer, audioUrl]);

  if (!suporteMediaRecorder) {
    return (
      <div className="flex items-center gap-2 border-t border-border bg-background-surface px-3 py-2.5">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <p className="text-xs text-foreground-muted">{erro ?? "Gravacao de audio nao suportada."}</p>
      </div>
    );
  }

  if (estado === "idle") {
    return (
      <div className="flex items-center gap-2 border-t border-border bg-background-surface px-3 py-2.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={iniciarGravacao}
        >
          <Mic className="h-4 w-4" /> Gravar audio
        </Button>
        {erro && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" /> {erro}
          </p>
        )}
      </div>
    );
  }

  if (estado === "recording") {
    const progresso = tempo / 300;
    return (
      <div className="border-t border-border bg-background-surface px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
              <span className="font-mono text-sm font-medium text-destructive">
                {formatarTempo(tempo)}
              </span>
              {tempo > 270 && (
                <span className="text-xs text-amber-500">Limite proximo</span>
              )}
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-destructive transition-all duration-1000"
                style={{ width: `${progresso * 100}%` }}
              />
            </div>
          </div>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-10 w-10 rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
            onClick={pararGravacao}
            aria-label="Parar gravacao"
          >
            <Square className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-background-surface px-3 py-2.5">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full text-foreground hover:bg-muted"
          onClick={togglePlay}
          aria-label="Reproduzir audio"
        >
          <Play className="h-4 w-4" />
        </Button>

        <div className="flex flex-1 items-end gap-0.5">
          {waveformBarras.map((altura, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-success/60"
              style={{ height: `${Math.round(altura * 32)}px`, minHeight: "4px" }}
            />
          ))}
        </div>

        <span className="font-mono text-xs text-foreground-muted">{formatarTempo(tempo)}</span>
      </div>

      <div className="mt-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 rounded-md text-xs text-foreground-muted hover:text-foreground"
          onClick={handleCancelar}
          disabled={sending}
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" /> Descartar
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          className="h-7 rounded-md bg-success text-success-foreground hover:bg-success/90 text-xs"
          onClick={handleEnviar}
          disabled={sending}
        >
          {sending ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-success-foreground/30 border-t-success-foreground" />
              Enviando...
            </span>
          ) : (
            <>
              <Send className="mr-1 h-3.5 w-3.5" /> Enviar audio
            </>
          )}
        </Button>
      </div>

      {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
    </div>
  );
}
