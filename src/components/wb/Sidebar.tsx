import { useMemo, useState } from "react";
import {
  ChevronRight, Plus, Search, Settings2, Trash2, Network, Clock, Map as MapIcon,
  ArrowLeft, Download, Library, MoreVertical, Pencil, EyeOff, Eye, FolderPlus, Sliders, HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon, ICON_CHOICES } from "./icons";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useModals } from "./confirm";
import type { ProjectMeta, Template, DocumentEntry, WorkspaceState } from "@/lib/worldbuilder/types";

interface Props {
  project: ProjectMeta;
  onExit: () => void;
  onRename: (name: string) => void;
  onIconChange: (icon: string) => void;
  onExport: () => void;
  onOpenCommand: () => void;
  onOpenTemplates: () => void;
  onOpenLibrary: () => void;
  onOpenTutorial: () => void;
}

export function Sidebar({
  project, onExit, onRename, onIconChange, onExport,
  onOpenCommand, onOpenTemplates, onOpenLibrary, onOpenTutorial,
}: Props) {
  const { state, openTab, createDocument, deleteDocument, setView, setActiveTab, setSettings, createTemplate } = useWorld();
  const { confirm, prompt } = useModals();
  const [iconOpen, setIconOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(project.name);
  const hideEmpty = !!state.settings?.hideEmptyFields;
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState("");

  const grouped = useMemo(() => {
    const lower = filter.toLowerCase();
    const docsFor = (tplId: string) =>
      state.documents
        .filter((d) => d.templateId === tplId && d.title.toLowerCase().includes(lower))
        .sort((a, b) => a.title.localeCompare(b.title));
    const childrenOf = (parentId: string | null) =>
      state.templates.filter((t) => (t.parentId ?? null) === parentId);
    return { childrenOf, docsFor };
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
      {/* Project header */}
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        <button
          onClick={onExit}
          title="Voltar ao menu inicial"
          className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setIconOpen(true)}
          title="Mudar ícone"
          className="w-7 h-7 rounded-md bg-gradient-to-br from-primary/40 to-chart-3/20 border border-sidebar-border flex items-center justify-center hover:from-primary/60 transition-colors"
        >
          <Icon name={project.icon} className="w-4 h-4 text-primary" />
        </button>
        <button
          onClick={() => { setRenameValue(project.name); setRenameOpen(true); }}
          className="font-semibold tracking-tight truncate flex-1 text-left text-sm hover:text-primary"
          title="Renomear projeto"
        >{project.name}</button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 rounded hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => { setRenameValue(project.name); setRenameOpen(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Renomear projeto
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIconOpen(true)}>
              <Icon name={project.icon} className="w-3.5 h-3.5 mr-2" /> Mudar ícone
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="w-3.5 h-3.5 mr-2" /> Exportar projeto
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenTutorial}>
              <HelpCircle className="w-3.5 h-3.5 mr-2" /> Tutorial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSettings({ hideEmptyFields: !hideEmpty })}>
              {hideEmpty ? <Eye className="w-3.5 h-3.5 mr-2" /> : <EyeOff className="w-3.5 h-3.5 mr-2" />}
              {hideEmpty ? "Mostrar campos vazios" : "Ocultar campos vazios"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onExit}>
              <ArrowLeft className="w-3.5 h-3.5 mr-2" /> Voltar ao menu
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenLibrary}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
            title="Biblioteca de templates"
          >
            <Library className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenTemplates}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
            title="Gerenciar templates"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto px-2 pb-4">
        {grouped.childrenOf(null).map((tpl) => (
          <TemplateNode
            key={tpl.id}
            tpl={tpl}
            depth={0}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            childrenOf={grouped.childrenOf}
            docsFor={grouped.docsFor}
            activeDocId={state.activeTab}
            view={state.view}
            onOpenDoc={openTab}
            onCreateDoc={(tplId, name) => createDocument(tplId, "Novo " + name.replace(/s$/, ""))}
            onAddSub={async (parent) => {
              const name = await prompt({
                title: `Nova subcategoria em "${parent.name}"`,
                placeholder: "Nome da subcategoria",
                confirmText: "Criar",
              });
              if (name?.trim()) createTemplate(name.trim(), parent.icon, parent.id);
            }}
            onDeleteDoc={async (d) => {
              const ok = await confirm({
                title: `Excluir "${d.title}"?`,
                description: "Esta ação não pode ser desfeita.",
                confirmText: "Excluir",
                destructive: true,
              });
              if (ok) deleteDocument(d.id);
            }}
            onOpenTemplateManager={onOpenTemplates}
          />
        ))}

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenTemplates}
          className="w-full justify-start mt-2 text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Novo Template
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenLibrary}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-sidebar-foreground"
        >
          <Library className="w-3.5 h-3.5 mr-1" /> Biblioteca de Templates
        </Button>
      </div>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear projeto</DialogTitle></DialogHeader>
          <Input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && renameValue.trim()) { onRename(renameValue.trim()); setRenameOpen(false); } }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button disabled={!renameValue.trim()} onClick={() => { onRename(renameValue.trim()); setRenameOpen(false); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Icon dialog */}
      <Dialog open={iconOpen} onOpenChange={setIconOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ícone do projeto</DialogTitle></DialogHeader>
          <Select value={project.icon} onValueChange={(v) => { onIconChange(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-64">
              {ICON_CHOICES.map((n) => (
                <SelectItem key={n} value={n}>
                  <div className="flex items-center gap-2"><Icon name={n} className="w-3.5 h-3.5" /> {n}</div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button onClick={() => setIconOpen(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  );
}

function TemplateNode({
  tpl, depth, collapsed, setCollapsed, childrenOf, docsFor,
  activeDocId, view, onOpenDoc, onCreateDoc, onAddSub, onDeleteDoc, onOpenTemplateManager,
}: {
  tpl: Template;
  depth: number;
  collapsed: Record<string, boolean>;
  setCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  childrenOf: (parentId: string | null) => Template[];
  docsFor: (tplId: string) => DocumentEntry[];
  activeDocId: string | null;
  view: WorkspaceState["view"];
  onOpenDoc: (id: string) => void;
  onCreateDoc: (tplId: string, name: string) => void;
  onAddSub: (parent: Template) => void;
  onDeleteDoc: (d: DocumentEntry) => void;
  onOpenTemplateManager: () => void;
}) {
  const isCollapsed = collapsed[tpl.id];
  const docs = docsFor(tpl.id);
  const subs = childrenOf(tpl.id);
  return (
    <div className="mb-0.5" style={{ paddingLeft: depth * 10 }}>
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
          onClick={() => onAddSub(tpl)}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-sidebar-accent text-sidebar-foreground/70"
          title="Nova subcategoria"
        >
          <FolderPlus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onCreateDoc(tpl.id, tpl.name)}
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
            {subs.map((s) => (
              <TemplateNode
                key={s.id}
                tpl={s}
                depth={depth + 1}
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                childrenOf={childrenOf}
                docsFor={docsFor}
                activeDocId={activeDocId}
                view={view}
                onOpenDoc={onOpenDoc}
                onCreateDoc={onCreateDoc}
                onAddSub={onAddSub}
                onDeleteDoc={onDeleteDoc}
                onOpenTemplateManager={onOpenTemplateManager}
              />
            ))}
            {docs.length === 0 && subs.length === 0 && (
              <div className="text-[11px] text-sidebar-foreground/40 italic px-2 py-1">Sem entradas</div>
            )}
            {docs.map((d) => (
              <div key={d.id} className="group flex items-center gap-1.5 rounded-md hover:bg-sidebar-accent">
                <button
                  onClick={() => onOpenDoc(d.id)}
                  className={cn(
                    "flex-1 text-left px-2 py-1 text-sm truncate text-sidebar-foreground/80 hover:text-sidebar-foreground",
                    activeDocId === d.id && view === "document" && "text-primary font-medium",
                  )}
                >
                  {d.title}
                </button>
                <button
                  onClick={onOpenTemplateManager}
                  className="opacity-0 group-hover:opacity-100 px-1 text-sidebar-foreground/50 hover:text-primary"
                  title="Abrir gerenciador de templates"
                >
                  <Sliders className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDeleteDoc(d)}
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
}