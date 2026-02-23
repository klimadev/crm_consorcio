type ConfigsErrorAlertProps = {
  erro: string | null;
};

export function ConfigsErrorAlert({ erro }: ConfigsErrorAlertProps) {
  if (!erro) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-rose-200/60 bg-rose-50/50 px-4 py-3 shadow-sm">
      <p className="text-sm font-medium text-rose-700">{erro}</p>
    </div>
  );
}
