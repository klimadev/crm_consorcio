"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FlaskConical, LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  aberto: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ModalSenhaDev({ aberto, onClose, onSuccess }: Props) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (senha === process.env.NEXT_PUBLIC_DEV_PASSWORD) {
      setErro(false);
      setSenha("");
      onSuccess();
    } else {
      setErro(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleClose = () => {
    setSenha("");
    setErro(false);
    onClose();
  };

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <FlaskConical className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-base">Area do Desenvolvedor</DialogTitle>
              <DialogDescription className="text-xs">
                Ferramentas experimentais e em desenvolvimento
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-muted" />
              <Input
                type="password"
                placeholder="Senha de acesso"
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value);
                  setErro(false);
                }}
                className={cn(
                  "pl-9",
                  shake && "animate-shake",
                  erro && "border-rose-500 focus-visible:ring-rose-500",
                )}
                autoFocus
              />
            </div>
            {erro && (
              <p className="text-xs font-medium text-rose-500">
                Senha incorreta
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!senha.trim()}
              className="flex-1"
            >
              Acessar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
