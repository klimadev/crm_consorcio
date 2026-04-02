"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WhatsappChatMessage } from "@/modules/whatsapp/types";

type Props = {
  message: WhatsappChatMessage;
  autoPlayRequested?: boolean;
  autoPlaySequence?: number | null;
  onEnded?: () => void;
};

type MediaContent = {
  base64: string;
  mediaType: string;
  mimetype: string;
  fileName: string;
  seconds: number | null;
};

type PlaybackRate = (typeof SPEED_OPTIONS)[number];
type PlayerState = "loading" | "ready" | "playing" | "buffering" | "paused" | "ended" | "error";

const mediaCache = new Map<string, { media: MediaContent; timestamp: number }>();
const waveformCache = new Map<string, number[]>();
const MEDIA_CACHE_TTL_MS = 5 * 60 * 1000;
const MEDIA_FETCH_TIMEOUT_MS = 10_000;
const MEDIA_FETCH_RETRIES = 2;
const SPEED_OPTIONS = [1, 1.5, 2] as const;
const DEFAULT_PLAYBACK_RATE: PlaybackRate = 1;
const PLAYBACK_RATE_STORAGE_KEY = "chat-audio-playback-rate";
const WAVEFORM_BAR_COUNT = 28;
const WAVEFORM_MIN_HEIGHT = 0.26;
const WAVEFORM_MAX_HEIGHT = 1;

let activeAudioElement: HTMLAudioElement | null = null;
let playbackRateSnapshot: PlaybackRate = DEFAULT_PLAYBACK_RATE;
const playbackRateListeners = new Set<() => void>();

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatPlaybackRate(rate: number) {
  return `${rate.toString().replace(".", ",")}x`;
}

function criarSrcDoAudio(base64: string, mimetype: string) {
  if (base64.startsWith("data:")) return base64;
  return `data:${mimetype};base64,${base64}`;
}

function getCacheKey(leadId: string, messageId: string) {
  return `${leadId}:${messageId}`;
}

function getCachedMedia(leadId: string, messageId: string): MediaContent | null {
  const chave = getCacheKey(leadId, messageId);
  const cached = mediaCache.get(chave);

  if (cached && Date.now() - cached.timestamp < MEDIA_CACHE_TTL_MS) {
    return cached.media;
  }

  mediaCache.delete(chave);
  return null;
}

function setCachedMedia(leadId: string, messageId: string, media: MediaContent) {
  mediaCache.set(getCacheKey(leadId, messageId), { media, timestamp: Date.now() });
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hashString(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function gerarWaveformSimplificada(seedSource: string) {
  const cached = waveformCache.get(seedSource);
  if (cached) return cached;

  let seed = hashString(seedSource) || 1;
  const midpoint = (WAVEFORM_BAR_COUNT - 1) / 2;

  const bars = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
    seed = (seed * 1664525 + 1013904223 + index * 97) >>> 0;
    const random = (seed % 1000) / 1000;
    const distanceFromCenter = Math.abs(index - midpoint) / midpoint;
    const contour = 1 - Math.pow(distanceFromCenter, 1.45);
    const amplitude =
      WAVEFORM_MIN_HEIGHT +
      (0.28 + contour * 0.72) * (0.55 + random * 0.45) * (WAVEFORM_MAX_HEIGHT - WAVEFORM_MIN_HEIGHT);

    return Number(clamp(amplitude, WAVEFORM_MIN_HEIGHT, WAVEFORM_MAX_HEIGHT).toFixed(2));
  });

  waveformCache.set(seedSource, bars);
  return bars;
}

function lerPlaybackRateSalvo(): PlaybackRate {
  if (typeof window === "undefined") return playbackRateSnapshot;

  try {
    const raw = window.sessionStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
    if (!raw) return playbackRateSnapshot;

    const parsed = Number(raw);
    if (SPEED_OPTIONS.includes(parsed as PlaybackRate)) {
      return parsed as PlaybackRate;
    }
  } catch {
    // Ignora falhas de storage.
  }

  return playbackRateSnapshot;
}

function getPlaybackRateSnapshot() {
  const rate = lerPlaybackRateSalvo();
  if (rate !== playbackRateSnapshot) {
    playbackRateSnapshot = rate;
  }

  return playbackRateSnapshot;
}

function subscribePlaybackRate(listener: () => void) {
  playbackRateListeners.add(listener);
  return () => playbackRateListeners.delete(listener);
}

function persistPlaybackRate(rate: PlaybackRate) {
  playbackRateSnapshot = rate;

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(rate));
    } catch {
      // Ignora falhas de storage.
    }
  }

  playbackRateListeners.forEach((listener) => listener());
}

function usePlaybackRateStore() {
  const playbackRate = useSyncExternalStore(
    subscribePlaybackRate,
    getPlaybackRateSnapshot,
    () => DEFAULT_PLAYBACK_RATE,
  );

  const setPlaybackRate = useCallback((rate: PlaybackRate) => {
    persistPlaybackRate(rate);
  }, []);

  return [playbackRate, setPlaybackRate] as const;
}

function getPlayerState(params: {
  error: string | null;
  isLoading: boolean;
  isBuffering: boolean;
  isPlaying: boolean;
  isEnded: boolean;
  currentTime: number;
}): PlayerState {
  if (params.error) return "error";
  if (params.isLoading) return "loading";
  if (params.isBuffering) return "buffering";
  if (params.isPlaying) return "playing";
  if (params.isEnded) return "ended";
  if (params.currentTime > 0) return "paused";
  return "ready";
}

export function AudioMessageBubble({
  message,
  autoPlayRequested = false,
  autoPlaySequence,
  onEnded,
}: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [playbackRate, setPlaybackRate] = usePlaybackRateStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoPlayHandledRef = useRef<number | null>(null);

  const waveformBars = useMemo(() => gerarWaveformSimplificada(message.messageId), [message.messageId]);
  const progressRatio = duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;
  const playedBarCount = Math.floor(progressRatio * waveformBars.length);
  const currentBarIndex = duration > 0 ? Math.min(waveformBars.length - 1, Math.floor(progressRatio * waveformBars.length)) : -1;
  const playerState = getPlayerState({
    error,
    isLoading,
    isBuffering,
    isPlaying,
    isEnded,
    currentTime,
  });
  const outgoing = message.fromMe;
  const playLabel =
    playerState === "playing"
      ? "Pausar áudio"
      : playerState === "buffering"
        ? "Carregando áudio"
        : playerState === "ended"
          ? "Reproduzir novamente"
          : currentTime > 0
            ? "Retomar áudio"
            : "Reproduzir áudio";
  const totalLabel = duration > 0 ? formatDuration(duration) : "--:--";
  const currentLabel = formatDuration(currentTime);
  const playbackRateLabel = formatPlaybackRate(playbackRate);

  const bubbleBaseClassName = cn(
    "flex items-center gap-3 border px-4 py-3 shadow-sm transition-all duration-300",
    outgoing
      ? "border-[#b7e6b0] bg-[#d9fdd3] text-slate-900"
      : "border-slate-200 bg-white text-slate-900",
    (playerState === "playing" || playerState === "buffering") &&
      "shadow-[0_12px_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-300/40",
  );

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [audioUrl, playbackRate]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MEDIA_FETCH_TIMEOUT_MS);
    let mounted = true;

    async function carregarAudio() {
      const cached = getCachedMedia(message.leadId, message.messageId);

      if (cached) {
        if (!mounted) return;

        setAudioUrl(criarSrcDoAudio(cached.base64, cached.mimetype ?? "audio/ogg"));
        setDuration(typeof cached.seconds === "number" ? cached.seconds : 0);
        setError(null);
        setIsLoading(false);
        setIsBuffering(false);
        setIsEnded(false);
        return;
      }

      if (!mounted) return;

      setIsLoading(true);
      setError(null);
      setIsBuffering(false);

      try {
        let lastError = "Erro ao carregar áudio";

        for (let tentativa = 0; tentativa <= MEDIA_FETCH_RETRIES; tentativa += 1) {
          if (controller.signal.aborted) return;

          try {
            const resposta = await fetch(
              `/api/whatsapp/chat/media?leadId=${encodeURIComponent(message.leadId)}&messageId=${encodeURIComponent(message.messageId)}`,
              {
                method: "GET",
                cache: "no-store",
                signal: controller.signal,
              },
            );

            if (!resposta.ok) {
              const dadosErro = await resposta.json().catch(() => ({}));
              lastError = dadosErro.erro || `Erro ao carregar áudio (${resposta.status})`;

              if (resposta.status >= 500 && tentativa < MEDIA_FETCH_RETRIES) {
                await delay(500 * (tentativa + 1));
                continue;
              }

              break;
            }

            const dados = await resposta.json();

            if (!dados?.media?.base64) {
              lastError = "Mídia não encontrada";
              break;
            }

            const media: MediaContent = dados.media;
            setCachedMedia(message.leadId, message.messageId, media);

            if (!mounted) return;

            setAudioUrl(criarSrcDoAudio(media.base64, media.mimetype ?? "audio/ogg"));
            setDuration(typeof media.seconds === "number" ? media.seconds : 0);
            setError(null);
            setIsBuffering(false);
            setIsEnded(false);
            return;
          } catch (err) {
            if (controller.signal.aborted) return;

            lastError =
              err instanceof Error && err.name === "AbortError"
                ? "Tempo limite excedido"
                : err instanceof Error
                  ? err.message
                  : "Erro ao carregar áudio";

            if (tentativa < MEDIA_FETCH_RETRIES) {
              await delay(500 * (tentativa + 1));
              continue;
            }
          }
        }

        if (mounted) {
          setError(lastError);
        }
      } catch (err) {
        if (controller.signal.aborted || !mounted) return;
        setError(err instanceof Error ? err.message : "Erro ao carregar áudio");
      } finally {
        if (!controller.signal.aborted && mounted) {
          setIsLoading(false);
        }
      }
    }

    void carregarAudio();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [message.leadId, message.messageId, tentativas]);

  useEffect(() => {
    const audioElement = audioRef.current;

    return () => {
      if (activeAudioElement === audioElement) {
        activeAudioElement = null;
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    autoPlayHandledRef.current = null;
  }, [message.messageId]);

  const handleRetry = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (activeAudioElement === audioRef.current) {
      activeAudioElement = null;
    }

    autoPlayHandledRef.current = null;
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    setIsBuffering(false);
    setIsEnded(false);
    setError(null);
    setTentativas((valor) => valor + 1);
  };

  const handleTogglePlay = useCallback(async () => {
    const audio = audioRef.current;

    if (!audio) return;

    setError(null);
    setIsEnded(false);

    if (isPlaying) {
      audio.pause();
      return;
    }

    if (activeAudioElement && activeAudioElement !== audio) {
      activeAudioElement.pause();
    }

    if (audio.ended || currentTime >= (duration || 0)) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    audio.playbackRate = playbackRate;
    setIsBuffering(true);

    try {
      await audio.play();
    } catch (err) {
      setIsBuffering(false);
      setError(err instanceof Error ? err.message : "Não foi possível reproduzir este áudio");
    }
  }, [currentTime, duration, isPlaying, playbackRate]);

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;

    if (Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
    }
  }, []);

  const handleEnded = useCallback(() => {
    if (activeAudioElement === audioRef.current) {
      activeAudioElement = null;
    }

    setIsPlaying(false);
    setIsBuffering(false);
    setIsEnded(true);

    if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
      setCurrentTime(audioRef.current.duration);
    }

    onEnded?.();
  }, [onEnded]);

  const handleTogglePlaybackRate = useCallback(() => {
    const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
    const nextRate = SPEED_OPTIONS[(currentIndex + 1 + SPEED_OPTIONS.length) % SPEED_OPTIONS.length];
    setPlaybackRate(nextRate);
  }, [playbackRate, setPlaybackRate]);

  useEffect(() => {
    if (!autoPlayRequested || autoPlaySequence == null || !audioUrl || error || isLoading) return;
    if (autoPlayHandledRef.current === autoPlaySequence) return;

    autoPlayHandledRef.current = autoPlaySequence;
    const timeout = window.setTimeout(() => {
      void handleTogglePlay();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [autoPlayRequested, autoPlaySequence, audioUrl, error, isLoading, handleTogglePlay]);

  if (error) {
    return (
      <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
        <div
          className="flex items-center gap-3 border border-rose-200 bg-rose-50 px-4 py-3 text-rose-900 shadow-sm"
          style={{
            width: "min(100%, 380px)",
            borderRadius: outgoing ? "22px 22px 6px 22px" : "22px 22px 22px 6px",
          }}
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-rose-600 shadow-sm">
            <AlertCircle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-rose-800">Não foi possível carregar o áudio</p>
            <p className="mt-1 text-xs leading-5 text-rose-700/90">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-3 h-8 rounded-full border-rose-200 bg-white px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
            >
              <RotateCcw className="mr-1 h-3.5 w-3.5" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!audioUrl) {
    return (
      <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
        <div
          className={bubbleBaseClassName}
          style={{
            width: "min(100%, 380px)",
            borderRadius: outgoing ? "22px 22px 6px 22px" : "22px 22px 22px 6px",
          }}
        >
          <Button
            type="button"
            variant="success"
            size="icon"
            disabled
            className="h-12 w-12 shrink-0 rounded-full bg-[#00a884] text-white shadow-sm shadow-emerald-900/10 disabled:opacity-100"
            aria-label={isLoading ? "Carregando áudio" : "Preparando áudio"}
          >
            <Loader2 className="h-5 w-5 animate-spin" />
          </Button>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex h-8 items-end gap-[2px] overflow-hidden">
              {waveformBars.map((amplitude, index) => (
                <div
                  key={index}
                  className="w-1.5 rounded-full bg-slate-200/80"
                  style={{ height: `${Math.round(amplitude * 24)}px` }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
              <span>0:00</span>
              <span>--:--</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full ${outgoing ? "justify-end" : "justify-start"}`}>
      <div
        className={bubbleBaseClassName}
        style={{
          width: "min(100%, 380px)",
          borderRadius: outgoing ? "22px 22px 6px 22px" : "22px 22px 22px 6px",
        }}
      >
        <Button
          type="button"
          variant="success"
          size="icon"
          onClick={() => void handleTogglePlay()}
          disabled={!audioUrl}
          className="h-12 w-12 shrink-0 rounded-full bg-[#00a884] text-white shadow-sm shadow-emerald-900/10 hover:bg-[#008f6b]"
          aria-label={playLabel}
        >
          {playerState === "playing" ? (
            <Pause className="h-5 w-5" />
          ) : playerState === "buffering" || playerState === "loading" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Play className="h-5 w-5 translate-x-[1px]" />
          )}
        </Button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex h-8 items-end gap-[2px] overflow-hidden">
            {waveformBars.map((amplitude, index) => {
              const isPlayed = index < playedBarCount;
              const isCurrentBar = index === currentBarIndex;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    if (!audioRef.current || !duration) return;
                    const newTime = (index / waveformBars.length) * duration;
                    audioRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                    setIsEnded(false);
                  }}
                  disabled={duration <= 0 || Boolean(error)}
                  className={cn(
                    "w-1.5 rounded-full origin-bottom transition-all duration-200 ease-out",
                    isPlayed ? "bg-slate-400" : "bg-[#00a884]",
                    isCurrentBar && isPlaying && "scale-y-110 shadow-[0_0_0_1px_rgba(255,255,255,0.18)]",
                    (duration <= 0 || Boolean(error)) && "opacity-60",
                  )}
                  style={{ height: `${Math.round(amplitude * 24)}px` }}
                  aria-label={`Ir para ${formatDuration((index / waveformBars.length) * (duration || 0))}`}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>{currentLabel}</span>
            <span>{totalLabel}</span>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTogglePlaybackRate}
              disabled={Boolean(error)}
              className="h-8 min-w-14 rounded-full border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
              aria-label={`Velocidade ${playbackRateLabel}`}
            >
              {playbackRateLabel}
            </Button>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl ?? undefined}
          preload="metadata"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onPlay={() => {
            setIsPlaying(true);
            setIsBuffering(false);
            setIsEnded(false);
            activeAudioElement = audioRef.current;
          }}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
          onWaiting={() => setIsBuffering(true)}
          onPause={() => {
            setIsPlaying(false);
            setIsBuffering(false);

            if (activeAudioElement === audioRef.current) {
              activeAudioElement = null;
            }
          }}
        />
      </div>
    </div>
  );
}
