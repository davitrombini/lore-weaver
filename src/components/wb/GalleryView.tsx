import { useMemo } from "react";
import { useWorld } from "@/lib/worldbuilder/store";
import { Image as ImageIcon } from "lucide-react";

export function GalleryView() {
  const { state, openTab } = useWorld();

  const items = useMemo(() => {
    const out: { src: string; title: string; docId?: string; source: string }[] = [];
    for (const d of state.documents.filter((x) => !x.deletedAt)) {
      const tpl = state.templates.find((t) => t.id === d.templateId);
      if (!tpl) continue;
      for (const f of tpl.fields) {
        if (f.type !== "image") continue;
        const v = d.values[f.id];
        if (typeof v === "string" && v) out.push({ src: v, title: d.title, docId: d.id, source: tpl.name });
      }
    }
    for (const m of state.maps) out.push({ src: m.image, title: m.name, source: "Mapa" });
    return out;
  }, [state.documents, state.templates, state.maps]);

  return (
    <div className="h-full overflow-auto p-8">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-semibold mb-1">Galeria</h2>
        <p className="text-sm text-muted-foreground mb-6">Todas as imagens do seu mundo.</p>
        {items.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted-foreground">
            <ImageIcon className="w-8 h-8 mx-auto mb-3" />
            Nenhuma imagem ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((it, i) => (
              <button
                key={i}
                onClick={() => it.docId && openTab(it.docId)}
                className="group relative rounded-lg overflow-hidden border border-border bg-card hover:border-primary/50 transition-colors text-left"
              >
                <img src={it.src} alt={it.title} className="w-full aspect-square object-cover" />
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="text-xs font-medium text-white truncate">{it.title}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/60">{it.source}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}