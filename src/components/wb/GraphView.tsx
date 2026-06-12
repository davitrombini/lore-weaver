import { useMemo } from "react";
import { useWorld } from "@/lib/worldbuilder/store";
import { motion } from "framer-motion";

export function GraphView() {
  const { state, openTab } = useWorld();

  const layout = useMemo(() => {
    const docs = state.documents;
    const N = docs.length || 1;
    const W = 900, H = 600, CX = W / 2, CY = H / 2;
    const R = Math.min(W, H) / 2 - 80;
    const nodes = docs.map((d, i) => {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      return { id: d.id, title: d.title, x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R, templateId: d.templateId };
    });
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges: { a: string; b: string }[] = [];
    for (const d of docs) {
      const tpl = state.templates.find((t) => t.id === d.templateId);
      if (!tpl) continue;
      for (const f of tpl.fields) {
        if (f.type !== "relationship") continue;
        const v = d.values[f.id];
        const targets = Array.isArray(v) ? v : v ? [v] : [];
        for (const t of targets) {
          if (byId.has(t as string)) edges.push({ a: d.id, b: t as string });
        }
      }
    }
    return { W, H, nodes, edges, byId };
  }, [state.documents, state.templates]);

  const tplColor = (id: string) =>
    state.templates.find((t) => t.id === id)?.color ?? "oklch(0.72 0.16 55)";

  return (
    <div className="h-full w-full overflow-auto bg-[radial-gradient(circle_at_center,oklch(0.22_0.014_260)_0%,oklch(0.15_0.012_260)_70%)] p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Grafo</h2>
        <p className="text-sm text-muted-foreground">Clique em um nó para abrir o documento.</p>
      </div>
      <svg viewBox={`0 0 ${layout.W} ${layout.H}`} className="w-full h-[calc(100%-3rem)] max-w-[1100px] mx-auto">
        <defs>
          <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.15" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        {layout.edges.map((e, i) => {
          const a = layout.byId.get(e.a)!;
          const b = layout.byId.get(e.b)!;
          return (
            <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="oklch(0.5 0.02 260)" strokeOpacity="0.5" strokeWidth={1} />
          );
        })}
        {layout.nodes.map((n) => (
          <motion.g
            key={n.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            className="cursor-pointer"
            onClick={() => openTab(n.id)}
          >
            <circle cx={n.x} cy={n.y} r={28} fill="url(#nodeGlow)" />
            <circle
              cx={n.x}
              cy={n.y}
              r={14}
              fill={tplColor(n.templateId)}
              fillOpacity={0.85}
              stroke="oklch(0.94 0.005 250)"
              strokeOpacity={0.3}
              strokeWidth={1}
            />
            <text
              x={n.x}
              y={n.y + 32}
              textAnchor="middle"
              fill="oklch(0.94 0.005 250)"
              fontSize="11"
              className="select-none"
            >
              {n.title}
            </text>
          </motion.g>
        ))}
        {layout.nodes.length === 0 && (
          <text x={layout.W / 2} y={layout.H / 2} textAnchor="middle" fill="oklch(0.6 0.01 260)">
            Nenhum documento ainda.
          </text>
        )}
      </svg>
    </div>
  );
}