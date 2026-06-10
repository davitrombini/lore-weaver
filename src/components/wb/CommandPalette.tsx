import { useEffect } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";

export function CommandPalette({ open, setOpen, onOpenTemplates }: { open: boolean; setOpen: (o: boolean) => void; onOpenTemplates: () => void }) {
  const { state, openTab, createDocument, setView, setActiveTab } = useWorld();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search documents, templates, actions…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Documents">
          {state.documents.map((d) => {
            const tpl = state.templates.find((t) => t.id === d.templateId);
            return (
              <CommandItem
                key={d.id}
                value={`${d.title} ${tpl?.name ?? ""}`}
                onSelect={() => { openTab(d.id); setOpen(false); }}
              >
                {tpl && <Icon name={tpl.icon} className="w-4 h-4 mr-2" style={{ color: tpl.color }} />}
                <span>{d.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{tpl?.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Create">
          {state.templates.map((t) => (
            <CommandItem
              key={t.id}
              value={`new ${t.name}`}
              onSelect={() => { createDocument(t.id, "New " + t.name.replace(/s$/, "")); setOpen(false); }}
            >
              <Icon name={t.icon} className="w-4 h-4 mr-2" style={{ color: t.color }} />
              New {t.name.replace(/s$/, "")}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Views">
          <CommandItem onSelect={() => { setActiveTab(null); setView("graph"); setOpen(false); }}>Graph View</CommandItem>
          <CommandItem onSelect={() => { setActiveTab(null); setView("timeline"); setOpen(false); }}>Timeline View</CommandItem>
          <CommandItem onSelect={() => { setActiveTab(null); setView("map"); setOpen(false); }}>Map View</CommandItem>
          <CommandItem onSelect={() => { onOpenTemplates(); setOpen(false); }}>Open Template Manager</CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}