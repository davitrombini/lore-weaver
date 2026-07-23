import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, Check, PackagePlus } from "lucide-react";
import { TEMPLATE_COLLECTIONS } from "@/lib/worldbuilder/templateLibrary";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";
import { cn } from "@/lib/utils";
import { useModals } from "./confirm";

export function TemplateLibrary({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { createTemplate, addField, updateTemplate, state } = useWorld();
  const { confirm } = useModals();
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("Todos");
  const [collectionId, setCollectionId] = useState<string>(TEMPLATE_COLLECTIONS[0].id);
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const collection = TEMPLATE_COLLECTIONS.find((c) => c.id === collectionId) ?? TEMPLATE_COLLECTIONS[0];
  const categories = useMemo(
    () => Array.from(new Set(collection.templates.map((t) => t.category))),
    [collection],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collection.templates.filter((t) => {
      const matchesCat = activeCat === "Todos" || t.category === activeCat;
      const matchesQ = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [query, activeCat, collection]);

  const addToProject = (libId: string) => {
    const lib = collection.templates.find((t) => t.id === libId);
    if (!lib) return;
    const created = createTemplate(lib.name, lib.icon);
    updateTemplate({ ...created, color: lib.color });
    for (const f of lib.fields) {
      addField(created.id, { name: f.name, type: f.type, options: f.options, multi: f.multi, targetTemplateId: f.targetTemplateId });
    }
    setAdded((s) => ({ ...s, [libId]: true }));
    setTimeout(() => setAdded((s) => { const c = { ...s }; delete c[libId]; return c; }), 1500);
  };

  const importAll = async () => {
    const ok = await confirm({
      title: `Importar todos os ${collection.templates.length} templates de "${collection.name}"?`,
      description: "Cada template será adicionado ao projeto como uma nova categoria.",
      confirmText: "Importar todos",
    });
    if (!ok) return;
    for (const lib of collection.templates) {
      const created = createTemplate(lib.name, lib.icon);
      updateTemplate({ ...created, color: lib.color });
      for (const f of lib.fields) {
        addField(created.id, { name: f.name, type: f.type, options: f.options, multi: f.multi, targetTemplateId: f.targetTemplateId });
      }
    }
  };
  void state;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden h-[640px] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>Biblioteca de Templates</DialogTitle>
            <Button size="sm" variant="outline" onClick={importAll} className="gap-1.5">
              <PackagePlus className="w-3.5 h-3.5" /> Importar Biblioteca Toda
            </Button>
          </div>
        </DialogHeader>
        <div className="px-6 pt-3 pb-3 border-b border-border">
          <div className="flex gap-1.5">
            {TEMPLATE_COLLECTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCollectionId(c.id); setActiveCat("Todos"); }}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg border transition-colors flex-1",
                  collectionId === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted",
                )}
              >{c.name}</button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">{collection.description}</p>
        </div>
        <div className="px-6 pt-4 pb-3 border-b border-border space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar templates…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {["Todos", ...categories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCat(cat)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  activeCat === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/40 text-muted-foreground border-border hover:text-foreground hover:bg-muted",
                )}
              >{cat}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((t) => (
            <div key={t.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors flex gap-3">
              <div
                className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center border border-border"
                style={{ background: `linear-gradient(135deg, ${t.color}40, transparent)` }}
              >
                <Icon name={t.icon} className="w-5 h-5" style={{ color: t.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium leading-tight">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{t.category}</div>
                  </div>
                  <Button
                    size="sm"
                    variant={added[t.id] ? "secondary" : "outline"}
                    onClick={() => addToProject(t.id)}
                    className="gap-1.5 shrink-0"
                  >
                    {added[t.id] ? <><Check className="w-3.5 h-3.5" /> Adicionado</> : <><Plus className="w-3.5 h-3.5" /> Adicionar</>}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{t.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {t.fields.slice(0, 5).map((f) => (
                    <span key={f.id} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{f.name}</span>
                  ))}
                  {t.fields.length > 5 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">+{t.fields.length - 5}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {!filtered.length && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-12">Nenhum template corresponde à busca.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}