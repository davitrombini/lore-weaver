import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { useWorld } from "@/lib/worldbuilder/store";
import { cn } from "@/lib/utils";

interface Props {
  value: string | string[] | undefined;
  multi?: boolean;
  targetTemplateId?: string;
  excludeId?: string;
  onChange: (v: string | string[] | undefined) => void;
  onOpenDocument?: (id: string) => void;
  readOnly?: boolean;
}

export function RelationshipField({ value, multi, targetTemplateId, excludeId, onChange, onOpenDocument, readOnly }: Props) {
  const { state } = useWorld();
  const [open, setOpen] = useState(false);
  const selectedIds = useMemo(() => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }, [value]);

  const candidates = useMemo(
    () =>
      state.documents.filter(
        (d) => d.id !== excludeId && (!targetTemplateId || d.templateId === targetTemplateId),
      ),
    [state.documents, targetTemplateId, excludeId],
  );

  const selectedDocs = selectedIds
    .map((id) => state.documents.find((d) => d.id === id))
    .filter(Boolean) as { id: string; title: string; templateId: string }[];

  const toggle = (id: string) => {
    if (multi) {
      const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
      onChange(next.length ? next : undefined);
    } else {
      onChange(value === id ? undefined : id);
      setOpen(false);
    }
  };

  if (readOnly) {
    if (!selectedDocs.length) return <div className="text-sm text-muted-foreground italic">None</div>;
    return (
      <div className="flex flex-wrap gap-1.5">
        {selectedDocs.map((d) => (
          <button
            key={d.id}
            onClick={() => onOpenDocument?.(d.id)}
            className="px-2.5 py-1 rounded-md bg-accent text-accent-foreground text-sm hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            {d.title}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {multi && selectedDocs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedDocs.map((d) => (
            <Badge key={d.id} variant="secondary" className="gap-1 pr-1">
              {d.title}
              <button onClick={() => toggle(d.id)} className="hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm hover:border-primary/50"
          >
            <span className={cn("truncate", !selectedDocs.length && "text-muted-foreground")}>
              {!multi && selectedDocs[0]?.title}
              {multi && (selectedDocs.length ? `${selectedDocs.length} selected` : "Link documents…")}
              {!multi && !selectedDocs[0] && "Select…"}
            </span>
            <ChevronsUpDown className="w-4 h-4 opacity-50 ml-2" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search documents…" />
            <CommandList>
              <CommandEmpty>No documents.</CommandEmpty>
              <CommandGroup>
                {candidates.map((d) => {
                  const tpl = state.templates.find((t) => t.id === d.templateId);
                  const checked = selectedIds.includes(d.id);
                  return (
                    <CommandItem key={d.id} value={d.title + " " + d.id} onSelect={() => toggle(d.id)}>
                      <Check className={cn("mr-2 h-4 w-4", checked ? "opacity-100" : "opacity-0")} />
                      <span className="flex-1 truncate">{d.title}</span>
                      <span className="text-xs text-muted-foreground ml-2">{tpl?.name}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}