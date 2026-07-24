import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { WorldProvider, useWorld } from "@/lib/worldbuilder/store";
import { Sidebar } from "@/components/wb/Sidebar";
import { Tabs } from "@/components/wb/Tabs";
import { DocumentView } from "@/components/wb/DocumentView";
import { GraphView } from "@/components/wb/GraphView";
import { TimelineView } from "@/components/wb/TimelineView";
import { MapView } from "@/components/wb/MapView";
import { GalleryView } from "@/components/wb/GalleryView";
import { StatsView } from "@/components/wb/StatsView";
import { TrashView } from "@/components/wb/TrashView";
import { CommandPalette } from "@/components/wb/CommandPalette";
import { TemplateManager } from "@/components/wb/TemplateManager";
import { TemplateLibrary } from "@/components/wb/TemplateLibrary";
import { TutorialDialog } from "@/components/wb/TutorialDialog";
import { MainMenu } from "@/components/wb/MainMenu";
import { ModalsProvider, useModals } from "@/components/wb/confirm";
import type { ProjectMeta, ProjectsIndex, WorkspaceState } from "@/lib/worldbuilder/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Void — Gerenciador de Worldbuilding e Campanhas de RPG" },
      { name: "description", content: "Um gerenciador moderno de worldbuilding e campanhas de RPG com templates, relacionamentos, visualização em grafo, linhas do tempo e mapas interativos." },
      { property: "og:title", content: "Void" },
      { property: "og:description", content: "Gerenciador de Worldbuilding e Campanhas de RPG." },
    ],
  }),
  component: IndexPage,
});

const INDEX_KEY = "void_projects_index";
const uid = () => Math.random().toString(36).slice(2, 10);

function loadIndex(): ProjectsIndex {
  if (typeof window === "undefined") return { projects: [], currentId: null };
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (raw) return JSON.parse(raw) as ProjectsIndex;
    // legacy migration: if a single legacy state exists, surface as a default project
    const legacy = localStorage.getItem("worldbuilder_state_v1");
    if (legacy) {
      const id = "p_" + uid();
      const idx: ProjectsIndex = {
        projects: [{ id, name: "Meu Mundo", icon: "Sparkles", updatedAt: Date.now() }],
        currentId: null,
      };
      localStorage.setItem(`void_project_${id}`, legacy);
      localStorage.removeItem("worldbuilder_state_v1");
      localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
      return idx;
    }
  } catch {}
  return { projects: [], currentId: null };
}

function IndexPage() {
  return (
    <ModalsProvider>
      <ProjectsRoot />
    </ModalsProvider>
  );
}

function ProjectsRoot() {
  const [idx, setIdx] = useState<ProjectsIndex>(loadIndex);

  useEffect(() => {
    try { localStorage.setItem(INDEX_KEY, JSON.stringify(idx)); } catch {}
  }, [idx]);

  const createProject = useCallback((name: string, icon: string): string => {
    const id = "p_" + uid();
    setIdx((s) => ({ ...s, projects: [...s.projects, { id, name, icon, updatedAt: Date.now() }] }));
    return id;
  }, []);

  const openProject = useCallback((id: string) => {
    setIdx((s) => ({ ...s, currentId: id }));
  }, []);

  const deleteProject = useCallback((id: string) => {
    try { localStorage.removeItem(`void_project_${id}`); } catch {}
    setIdx((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      currentId: s.currentId === id ? null : s.currentId,
    }));
  }, []);

  const exitToMenu = useCallback(() => {
    setIdx((s) => ({ ...s, currentId: null }));
  }, []);

  const renameProject = useCallback((id: string, name: string) => {
    setIdx((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const setProjectIcon = useCallback((id: string, icon: string) => {
    setIdx((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, icon, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const setProjectIconColor = useCallback((id: string, iconColor: string) => {
    setIdx((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === id ? { ...p, iconColor, updatedAt: Date.now() } : p)),
    }));
  }, []);

  const importProject = useCallback((name: string, icon: string, state: WorkspaceState) => {
    const id = "p_" + uid();
    try { localStorage.setItem(`void_project_${id}`, JSON.stringify(state)); } catch {}
    setIdx((s) => ({
      projects: [...s.projects, { id, name, icon, updatedAt: Date.now() }],
      currentId: id,
    }));
  }, []);

  const current = idx.projects.find((p) => p.id === idx.currentId) ?? null;

  if (!current) {
    return (
      <MainMenu
        projects={idx.projects}
        onCreate={createProject}
        onOpen={openProject}
        onDelete={deleteProject}
        onImport={importProject}
      />
    );
  }

  return (
    <WorldProvider key={current.id} projectId={current.id}>
      <Shell
        project={current}
        onExit={exitToMenu}
        onRename={(name) => renameProject(current.id, name)}
        onIconChange={(icon) => setProjectIcon(current.id, icon)}
        onIconColorChange={(c) => setProjectIconColor(current.id, c)}
      />
    </WorldProvider>
  );
}

interface ShellProps {
  project: ProjectMeta;
  onExit: () => void;
  onRename: (name: string) => void;
  onIconChange: (icon: string) => void;
  onIconColorChange: (color: string) => void;
}

function Shell({ project, onExit, onRename, onIconChange, onIconColorChange }: ShellProps) {
  const world = useWorld();
  const { state, openTab } = world;
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const [tutOpen, setTutOpen] = useState(false);
  const activeDoc = state.documents.find((d) => d.id === state.activeTab);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const undo = (world as unknown as { undo?: () => void }).undo;
      const redo = (world as unknown as { redo?: () => void }).redo;
      if (mod && !e.shiftKey && e.key.toLowerCase() === "z") { e.preventDefault(); undo?.(); }
      else if (mod && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo?.(); }
    };
    const onOpen = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id) openTab(id);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("void:open-doc", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("void:open-doc", onOpen as EventListener);
    };
  }, [openTab, world]);

  useEffect(() => {
    try {
      if (!localStorage.getItem("void_tutorial_pref")) setTutOpen(true);
    } catch {}
  }, []);

  const exportProject = useCallback(() => {
    const payload = { projectName: project.name, projectIcon: project.icon, state };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^\w\-]+/g, "_")}.void.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [project, state]);

  return (
    <div className="dark h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar
        project={project}
        onExit={onExit}
        onRename={onRename}
        onIconChange={onIconChange}
        onIconColorChange={onIconColorChange}
        onExport={exportProject}
        onOpenCommand={() => setCmdOpen(true)}
        onOpenTemplates={() => setTplOpen(true)}
        onOpenLibrary={() => setLibOpen(true)}
        onOpenTutorial={() => setTutOpen(true)}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        <Tabs />
        <div className="flex-1 min-h-0">
          {state.view === "document" && activeDoc && <DocumentView key={activeDoc.id} doc={activeDoc} />}
          {state.view === "document" && !activeDoc && <EmptyState />}
          {state.view === "graph" && <GraphView />}
          {state.view === "timeline" && <TimelineView />}
          {state.view === "map" && <MapView />}
          {state.view === "gallery" && <GalleryView />}
          {state.view === "stats" && <StatsView />}
          {state.view === "trash" && <TrashView />}
        </div>
      </main>
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} onOpenTemplates={() => setTplOpen(true)} />
      <TemplateManager open={tplOpen} onOpenChange={setTplOpen} onOpenLibrary={() => { setTplOpen(false); setLibOpen(true); }} />
      <TemplateLibrary open={libOpen} onOpenChange={setLibOpen} />
      <TutorialDialog open={tutOpen} onOpenChange={setTutOpen} />
    </div>
  );
}

// silence unused import (useModals available to children via context)
void useModals;

function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/30 to-chart-3/30 border border-border flex items-center justify-center mb-4">
          <span className="text-2xl">✦</span>
        </div>
        <h2 className="text-xl font-semibold mb-1">Bem-vindo ao Void</h2>
        <p className="text-sm text-muted-foreground">
          Abra um documento na barra lateral, pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd> para
          buscar, ou crie uma nova entrada a partir de um template.
        </p>
      </div>
    </div>
  );
}
