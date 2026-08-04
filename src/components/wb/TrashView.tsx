import { useMemo } from "react";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Trash } from "lucide-react";
import { useModals } from "./confirm";

export function TrashView() {
  const { state, restoreDocument, purgeDocument, restoreTemplate, purgeTemplate } = useWorld();
  const { confirm } = useModals();
  const deletedTemplates = useMemo(
    () => state.templates.filter((t) => t.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [state.templates],
  );
  const deletedTplIds = useMemo(() => new Set(deletedTemplates.map((t) => t.id)), [deletedTemplates]);
  const items = useMemo(
    () =>
      state.documents
        .filter((d) => d.deletedAt && !deletedTplIds.has(d.templateId))
        .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
    [state.documents, deletedTplIds],
  );

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-1 flex items-center gap-2"><Trash className="w-5 h-5" /> Lixeira</h2>
        <p className="text-sm text-muted-foreground mb-6">Documentos excluídos ficam aqui até serem apagados definitivamente.</p>
        {deletedTemplates.length > 0 && (
          <div className="space-y-2 mb-8">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Categorias</div>
            {deletedTemplates.map((t) => {
              const count = state.documents.filter((d) => d.templateId === t.id).length;
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                  <Icon name={t.icon} className="w-4 h-4" style={{ color: t.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {count} documento(s) · excluída em {new Date(t.deletedAt ?? 0).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => restoreTemplate(t.id)} className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Apagar a categoria "${t.name}" definitivamente?`,
                        description: "Todos os documentos dela serão apagados. Esta ação não pode ser desfeita.",
                        confirmText: "Apagar",
                        destructive: true,
                      });
                      if (ok) purgeTemplate(t.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        {items.length === 0 && deletedTemplates.length === 0 ? (
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