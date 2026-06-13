import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { WorldProvider, useWorld } from "@/lib/worldbuilder/store";
import { Sidebar } from "@/components/wb/Sidebar";
import { Tabs } from "@/components/wb/Tabs";
import { DocumentView } from "@/components/wb/DocumentView";
import { GraphView } from "@/components/wb/GraphView";
import { TimelineView } from "@/components/wb/TimelineView";
import { MapView } from "@/components/wb/MapView";
import { CommandPalette } from "@/components/wb/CommandPalette";
import { TemplateManager } from "@/components/wb/TemplateManager";
import { TemplateLibrary } from "@/components/wb/TemplateLibrary";
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
      />
    </WorldProvider>
  );
}

interface ShellProps {
  project: ProjectMeta;
  onExit: () => void;
  onRename: (name: string) => void;
  onIconChange: (icon: string) => void;
}

function Shell({ project, onExit, onRename, onIconChange }: ShellProps) {
  const { state } = useWorld();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [libOpen, setLibOpen] = useState(false);
  const activeDoc = state.documents.find((d) => d.id === state.activeTab);

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
        onExport={exportProject}
        onOpenCommand={() => setCmdOpen(true)}
        onOpenTemplates={() => setTplOpen(true)}
        onOpenLibrary={() => setLibOpen(true)}
      />
      <main className="flex-1 min-w-0 flex flex-col">
        <Tabs />
        <div className="flex-1 min-h-0">
          {state.view === "document" && activeDoc && <DocumentView key={activeDoc.id} doc={activeDoc} />}
          {state.view === "document" && !activeDoc && <EmptyState />}
          {state.view === "graph" && <GraphView />}
          {state.view === "timeline" && <TimelineView />}
          {state.view === "map" && <MapView />}
        </div>
      </main>
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} onOpenTemplates={() => setTplOpen(true)} />
      <TemplateManager open={tplOpen} onOpenChange={setTplOpen} onOpenLibrary={() => { setTplOpen(false); setLibOpen(true); }} />
      <TemplateLibrary open={libOpen} onOpenChange={setLibOpen} />
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
