import { Shield } from "lucide-react";

type AccessDeniedCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function AccessDeniedCard({ eyebrow = "Acesso restrito", title, description }: AccessDeniedCardProps) {
  return (
    <section className="rounded-2xl border border-amber-200/50 bg-amber-50/50 p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
          <Shield className="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-800">{title}</h2>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">{description}</p>
    </section>
  );
}
