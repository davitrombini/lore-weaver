import { useMemo } from "react";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";
import { motion } from "framer-motion";
import { formatBR } from "@/lib/worldbuilder/dateUtils";

export function TimelineView() {
  const { state, openTab } = useWorld();

  const events = useMemo(() => {
    const items: { id: string; title: string; date: string; templateId: string; fieldName: string }[] = [];
    for (const d of state.documents.filter((x) => !x.deletedAt)) {
      const tpl = state.templates.find((t) => t.id === d.templateId);
      if (!tpl) continue;
      for (const f of tpl.fields) {
        if (f.type !== "date") continue;
        const v = d.values[f.id];
        if (typeof v === "string" && v) {
          items.push({ id: d.id, title: d.title, date: v, templateId: d.templateId, fieldName: f.name });
        }
      }
    }
    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [state.documents, state.templates]);

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-1">Linha do Tempo</h2>
        <p className="text-sm text-muted-foreground mb-8">Todos os documentos com datas, em ordem cronológica.</p>
        {events.length === 0 ? (
          <div className="text-muted-foreground italic">Nenhum documento com data ainda.</div>
        ) : (
          <div className="relative pl-6 border-l border-border">
            {events.map((e, i) => {
              const tpl = state.templates.find((t) => t.id === e.templateId);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="relative mb-6 group"
                >
                  <div
                    className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full border-2 border-background"
                    style={{ background: tpl?.color ?? "var(--primary)" }}
                  />
                  <div
                    onClick={() => openTab(e.id)}
                    className="cursor-pointer rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="text-xs font-mono tracking-wider text-muted-foreground mb-1">
                      {formatBR(e.date)} · {e.fieldName}
                    </div>
                    <div className="flex items-center gap-2">
                      {tpl && <Icon name={tpl.icon} className="w-4 h-4" style={{ color: tpl.color }} />}
                      <span className="font-medium">{e.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{tpl?.name}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}