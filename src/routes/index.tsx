import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WorldProvider, useWorld } from "@/lib/worldbuilder/store";
import { Sidebar } from "@/components/wb/Sidebar";
import { Tabs } from "@/components/wb/Tabs";
import { DocumentView } from "@/components/wb/DocumentView";
import { GraphView } from "@/components/wb/GraphView";
import { TimelineView } from "@/components/wb/TimelineView";
import { MapView } from "@/components/wb/MapView";
import { CommandPalette } from "@/components/wb/CommandPalette";
import { TemplateManager } from "@/components/wb/TemplateManager";

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

function IndexPage() {
  return (
    <WorldProvider>
      <Shell />
    </WorldProvider>
  );
}

function Shell() {
  const { state } = useWorld();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const activeDoc = state.documents.find((d) => d.id === state.activeTab);

  return (
    <div className="dark h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar onOpenCommand={() => setCmdOpen(true)} onOpenTemplates={() => setTplOpen(true)} />
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
      <TemplateManager open={tplOpen} onOpenChange={setTplOpen} />
    </div>
  );
}

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
