"use client";

import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Funcionario } from "../types";

type TransferirLeadDialogProps = {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  funcionarios: Funcionario[];
  idPdvUsuario: string;
  nomeLead: string;
  enviando: boolean;
  onConfirmar: (idFuncionarioDestino: string) => Promise<void>;
};

export function TransferirLeadDialog({
  aberto,
  onOpenChange,
  funcionarios,
  idPdvUsuario,
  nomeLead,
  enviando,
  onConfirmar,
}: TransferirLeadDialogProps) {
  const [destinatarioId, setDestinatarioId] = useState<string>("");

  const funcionariosPdv = useMemo(
    () =>
      funcionarios.filter(
        (f) => f.id_pdv === idPdvUsuario && f.cargo === "COLABORADOR" && f.nome,
      ),
    [funcionarios, idPdvUsuario],
  );

  const handleConfirmar = async () => {
    if (!destinatarioId) return;
    await onConfirmar(destinatarioId);
  };

  const handleOpenChange = (aberto: boolean) => {
    if (!aberto) {
      setDestinatarioId("");
    }
    onOpenChange(aberto);
  };

  return (
    <Dialog open={aberto} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir Lead</DialogTitle>
          <DialogDescription>
            Envie o lead <strong>{nomeLead}</strong> como convite para outro
            colaborador do seu PDV. O destinatário precisará aceitar para que a
            transferência seja concluída.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Destinatário
            </label>
            <Select
              value={destinatarioId}
              onValueChange={setDestinatarioId}
              disabled={enviando}
            >
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="Escolha um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {funcionariosPdv.length === 0 ? (
                  <SelectItem value="vazio" disabled>
                    Nenhum colaborador disponível no seu PDV
                  </SelectItem>
                ) : (
                  funcionariosPdv.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!destinatarioId || enviando}
          >
            {enviando ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Enviar Convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
