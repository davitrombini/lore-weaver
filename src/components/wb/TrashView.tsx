import { useMemo } from "react";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Trash } from "lucide-react";
import { useModals } from "./confirm";

export function TrashView() {
  const { state, restoreDocument, purgeDocument } = useWorld();
  const { confirm } = useModals();
  const items = useMemo(
    () => state.documents.filter((d) => d.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [state.documents],
  );

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2"><Trash className="w-5 h-5" /> Lixeira</h2>
        <p className="text-sm text-muted-foreground mb-6">Documentos excluídos ficam aqui até serem apagados definitivamente.</p>
        {items.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">Lixeira vazia.</div>
        ) : (
          <div className="space-y-2">
            {items.map((d) => {
              const tpl = state.templates.find((t) => t.id === d.templateId);
              return (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  {tpl && <Icon name={tpl.icon} className="w-4 h-4" style={{ color: tpl.color }} />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{tpl?.name} · excluído em {new Date(d.deletedAt ?? 0).toLocaleString("pt-BR")}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreDocument(d.id)} className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Apagar "${d.title}" definitivamente?`,
                        description: "Esta ação não pode ser desfeita.",
                        confirmText: "Apagar",
                        destructive: true,
                      });
                      if (ok) purgeDocument(d.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}