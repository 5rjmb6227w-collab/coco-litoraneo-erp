import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Clock, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProductionTimerProps {
  onTimeUpdate?: (startTime: string, endTime: string, duration: number) => void;
  initialStartTime?: string;
  initialEndTime?: string;
}

export function ProductionTimer({ onTimeUpdate, initialStartTime, initialEndTime }: ProductionTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(
    initialStartTime ? new Date(`2000-01-01T${initialStartTime}`) : null
  );
  const [endTime, setEndTime] = useState<Date | null>(
    initialEndTime ? new Date(`2000-01-01T${initialEndTime}`) : null
  );
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pausedSeconds, setPausedSeconds] = useState(0);

  // Calcular tempo decorrido
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && !isPaused && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000) - pausedSeconds;
        setElapsedSeconds(Math.max(0, elapsed));
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, isPaused, startTime, pausedSeconds]);

  // Formatar tempo em HH:MM:SS
  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Iniciar timer
  const handleStart = useCallback(() => {
    const now = new Date();
    setStartTime(now);
    setEndTime(null);
    setIsRunning(true);
    setIsPaused(false);
    setElapsedSeconds(0);
    setPausedSeconds(0);
  }, []);

  // Pausar timer
  const handlePause = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Retomar timer
  const handleResume = useCallback(() => {
    if (startTime) {
      const now = new Date();
      const totalElapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setPausedSeconds(totalElapsed - elapsedSeconds);
    }
    setIsPaused(false);
  }, [startTime, elapsedSeconds]);

  // Parar timer
  const handleStop = useCallback(() => {
    const now = new Date();
    setEndTime(now);
    setIsRunning(false);
    setIsPaused(false);

    if (startTime && onTimeUpdate) {
      onTimeUpdate(
        format(startTime, "HH:mm"),
        format(now, "HH:mm"),
        elapsedSeconds
      );
    }
  }, [startTime, elapsedSeconds, onTimeUpdate]);

  // Resetar timer
  const handleReset = useCallback(() => {
    setStartTime(null);
    setEndTime(null);
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    setPausedSeconds(0);
  }, []);

  // Status do timer
  const getStatus = () => {
    if (!isRunning && !startTime) return { label: "Aguardando", color: "secondary" as const };
    if (isPaused) return { label: "Pausado", color: "outline" as const };
    if (isRunning) return { label: "Em Produção", color: "default" as const };
    if (endTime) return { label: "Finalizado", color: "secondary" as const };
    return { label: "Aguardando", color: "secondary" as const };
  };

  const status = getStatus();

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex flex-col items-center gap-4">
          {/* Header com status */}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Timer de Produção</span>
            </div>
            <Badge variant={status.color}>
              {status.label}
            </Badge>
          </div>

          {/* Display do tempo */}
          <div className="text-center">
            <div className={`font-mono text-4xl font-bold tracking-wider ${
              isRunning && !isPaused ? "text-primary" : "text-foreground"
            }`}>
              {formatTime(elapsedSeconds)}
            </div>
            {startTime && (
              <div className="text-xs text-muted-foreground mt-1">
                Início: {format(startTime, "HH:mm:ss", { locale: ptBR })}
                {endTime && ` | Fim: ${format(endTime, "HH:mm:ss", { locale: ptBR })}`}
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2">
            {!isRunning && !endTime && (
              <Button onClick={handleStart} className="gap-2">
                <Play className="h-4 w-4" />
                Iniciar
              </Button>
            )}

            {isRunning && !isPaused && (
              <>
                <Button onClick={handlePause} variant="outline" className="gap-2">
                  <Pause className="h-4 w-4" />
                  Pausar
                </Button>
                <Button onClick={handleStop} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" />
                  Parar
                </Button>
              </>
            )}

            {isPaused && (
              <>
                <Button onClick={handleResume} className="gap-2">
                  <Play className="h-4 w-4" />
                  Retomar
                </Button>
                <Button onClick={handleStop} variant="destructive" className="gap-2">
                  <Square className="h-4 w-4" />
                  Parar
                </Button>
              </>
            )}

            {endTime && (
              <Button onClick={handleReset} variant="outline" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Novo Timer
              </Button>
            )}
          </div>

          {/* Dica */}
          {!isRunning && !startTime && (
            <p className="text-xs text-muted-foreground text-center">
              Clique em "Iniciar" para começar a cronometrar o tempo de produção
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
