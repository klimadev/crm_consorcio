import { Shield } from "lucide-react";

type AccessDeniedCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
};

export function AccessDeniedCard({ eyebrow = "Acesso restrito", title, description }: AccessDeniedCardProps) {
  return (
    <section className="rounded-2xl border border-warning/25 bg-warning/10 p-8 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-warning/15">
          <Shield className="h-6 w-6 text-warning" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-warning">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">{title}</h2>
        </div>
      </div>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-foreground-muted">{description}</p>
    </section>
  );
}
