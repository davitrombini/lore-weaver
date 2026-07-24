import { useMemo } from "react";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";

export function StatsView() {
  const { state } = useWorld();

  const stats = useMemo(() => {
    const active = state.documents.filter((d) => !d.deletedAt);
    const counts = state.templates
      .map((t) => ({ tpl: t, count: active.filter((d) => d.templateId === t.id).length }))
      .sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...counts.map((c) => c.count));
    return { counts, max, total: active.length, deleted: state.documents.length - active.length };
  }, [state.documents, state.templates]);

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-1">Estatísticas</h2>
        <p className="text-sm text-muted-foreground mb-6">{stats.total} documentos ativos · {stats.deleted} na lixeira · {state.templates.length} categorias.</p>
        <div className="space-y-3">
          {stats.counts.map(({ tpl, count }) => (
            <div key={tpl.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon name={tpl.icon} className="w-4 h-4" style={{ color: tpl.color }} />
                <div className="font-medium flex-1">{tpl.name}</div>
                <div className="text-sm tabular-nums text-muted-foreground">{count}</div>
              </div>
              <div className="h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(count / stats.max) * 100}%`, background: tpl.color ?? "var(--primary)" }}
                />
              </div>
            </div>
          ))}
          {stats.counts.length === 0 && (
            <div className="text-muted-foreground italic">Nenhuma categoria.</div>
          )}
        </div>
      </div>
    </div>
  );
}