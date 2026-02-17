interface KPIWidgetProps {
  label: string;
  value: string | number;
  tone?: 'neutral' | 'good' | 'alert';
}

const toneClasses: Record<NonNullable<KPIWidgetProps['tone']>, string> = {
  neutral: 'bg-slate-100 text-slate-800',
  good: 'bg-emerald-100 text-emerald-800',
  alert: 'bg-rose-100 text-rose-800',
};

export function KPIWidget({ label, value, tone = 'neutral' }: KPIWidgetProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 inline-block rounded-lg px-2 py-1 text-xl font-bold ${toneClasses[tone]}`}>{value}</p>
    </div>
  );
}
