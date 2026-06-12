import { useMemo, useState } from "react";
import { ChevronRight, Plus, Search, Settings2, FileText, Trash2, Network, Clock, Map as MapIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onOpenCommand: () => void;
  onOpenTemplates: () => void;
}

export function Sidebar({ onOpenCommand, onOpenTemplates }: Props) {
  const { state, openTab, createDocument, deleteDocument, setView, setActiveTab } = useWorld();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    return state.templates.map((tpl) => ({
      tpl,
      docs: state.documents
        .filter((d) => d.templateId === tpl.id && d.title.toLowerCase().includes(filter.toLowerCase()))
        .sort((a, b) => a.title.localeCompare(b.title)),
    }));
  }, [state.templates, state.documents, filter]);

  const ViewBtn = ({ v, label, icon: I }: { v: typeof state.view; label: string; icon: typeof Network }) => (
    <button
      onClick={() => { setActiveTab(null); setView(v); }}
      className={cn(
        "flex items-center gap-2 w-full px-2.5 py-1.5 text-xs rounded-md transition-colors",
        state.view === v && !state.activeTab
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <I className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <aside className="w-72 shrink-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center">
          <FileText className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className="font-semibold tracking-tight">Void</div>
      </div>

      {/* Search trigger */}
      <div className="px-3 pb-2">
        <button
          onClick={onOpenCommand}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-sidebar-accent/40 hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground text-sm border border-sidebar-border"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-background/40 border border-sidebar-border">⌘K</kbd>
        </button>
      </div>

      {/* Filter docs */}
      <div className="px-3 pb-2">
        <input
          placeholder="Filtrar documentos"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 rounded-md bg-transparent text-xs border border-sidebar-border focus:outline-none focus:border-primary/60"
        />
      </div>

      {/* Views */}
      <div className="px-3 pb-2 space-y-0.5">
        <ViewBtn v="graph" label="Grafo" icon={Network} />
        <ViewBtn v="timeline" label="Linha do Tempo" icon={Clock} />
        <ViewBtn v="map" label="Mapas" icon={MapIcon} />
      </div>

      <div className="h-px bg-sidebar-border mx-3 my-2" />

      <div className="flex items-center justify-between px-4 pb-1">
        <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">Templates</div>
        <button
          onClick={onOpenTemplates}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          title="Gerenciar templates"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto px-2 pb-4">
        {grouped.map(({ tpl, docs }) => {
          const isCollapsed = collapsed[tpl.id];
          return (
            <div key={tpl.id} className="mb-1">
              <div className="group flex items-center gap-1 px-1.5 py-1 rounded-md hover:bg-sidebar-accent/50">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [tpl.id]: !c[tpl.id] }))}
                  className="p-0.5"
                >
                  <ChevronRight
                    className={cn("w-3.5 h-3.5 text-sidebar-foreground/50 transition-transform", !isCollapsed && "rotate-90")}
                  />
                </button>
                <Icon name={tpl.icon} className="w-3.5 h-3.5" style={{ color: tpl.color }} />
                <span className="text-sm font-medium flex-1 truncate">{tpl.name}</span>
                <span className="text-[10px] text-sidebar-foreground/40 mr-1">{docs.length}</span>
                <button
                  onClick={() => createDocument(tpl.id, "Novo " + tpl.name.replace(/s$/, ""))}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/70"
                  title="Nova entrada"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden pl-6"
                  >
                    {docs.length === 0 && (
                      <div className="text-[11px] text-sidebar-foreground/40 italic px-2 py-1">Sem entradas</div>
                    )}
                    {docs.map((d) => (
                      <div key={d.id} className="group flex items-center gap-1.5 rounded-md hover:bg-sidebar-accent">
                        <button
                          onClick={() => openTab(d.id)}
                          className={cn(
                            "flex-1 text-left px-2 py-1 text-sm truncate text-sidebar-foreground/80 hover:text-sidebar-foreground",
                            state.activeTab === d.id && state.view === "document" && "text-primary font-medium",
                          )}
                        >
                          {d.title}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Excluir "${d.title}"?`)) deleteDocument(d.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 px-1 text-sidebar-foreground/50 hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenTemplates}
          className="w-full justify-start mt-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Template
        </Button>
      </div>
    </aside>
  );
}