import { X } from "lucide-react";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export function Tabs() {
  const { state, setActiveTab, closeTab } = useWorld();
  if (!state.openTabs.length) return null;
  return (
    <div className="flex items-end gap-0.5 px-2 pt-2 bg-background border-b border-border overflow-x-auto">
      <AnimatePresence initial={false}>
        {state.openTabs.map((id) => {
          const doc = state.documents.find((d) => d.id === id);
          if (!doc) return null;
          const tpl = state.templates.find((t) => t.id === doc.templateId);
          const active = state.activeTab === id && state.view === "document";
          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className={cn(
                "group flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-t-md text-sm border border-b-0 max-w-[200px]",
                active
                  ? "bg-card border-border text-foreground"
                  : "bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <button
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-2 min-w-0"
              >
                {tpl && <Icon name={tpl.icon} className="w-3.5 h-3.5 shrink-0" style={{ color: tpl.color }} />}
                <span className="truncate">{doc.title || "Sem título"}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); closeTab(id); }}
                className="p-0.5 rounded hover:bg-background/60 opacity-60 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}