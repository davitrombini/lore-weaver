import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon, ICON_CHOICES } from "./icons";
import type { FieldType, Template } from "@/lib/worldbuilder/types";
import { cn } from "@/lib/utils";

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short Text" },
  { value: "richtext", label: "Rich Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "image", label: "Image" },
  { value: "relationship", label: "Relationship" },
];

export function TemplateManager({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { state, createTemplate, updateTemplate, deleteTemplate, addField, removeField } = useWorld();
  const [selectedId, setSelectedId] = useState<string | null>(state.templates[0]?.id ?? null);
  const selected = state.templates.find((t) => t.id === selectedId) ?? null;

  const [newField, setNewField] = useState<{ name: string; type: FieldType; target?: string; multi?: boolean; options?: string }>({
    name: "", type: "text",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden h-[640px] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-border">
          <DialogTitle>Template Manager</DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 min-h-0">
          {/* List */}
          <div className="w-60 border-r border-border bg-muted/30 p-3 overflow-auto">
            {state.templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm mb-0.5",
                  selectedId === t.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                <Icon name={t.icon} className="w-4 h-4" style={{ color: t.color }} />
                <span className="truncate flex-1 text-left">{t.name}</span>
                <span className="text-[10px] text-muted-foreground">{t.fields.length}</span>
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => {
                const t = createTemplate("New Template");
                setSelectedId(t.id);
              }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Template
            </Button>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-auto p-6">
            {selected ? (
              <TemplateEditor
                template={selected}
                onUpdate={updateTemplate}
                onDelete={() => {
                  if (confirm(`Delete template "${selected.name}" and all its documents?`)) {
                    deleteTemplate(selected.id);
                    setSelectedId(state.templates.find((t) => t.id !== selected.id)?.id ?? null);
                  }
                }}
                onRemoveField={(fid) => removeField(selected.id, fid)}
                onAddField={() => {
                  if (!newField.name.trim()) return;
                  addField(selected.id, {
                    name: newField.name.trim(),
                    type: newField.type,
                    targetTemplateId: newField.type === "relationship" ? newField.target : undefined,
                    multi: newField.type === "relationship" ? !!newField.multi : undefined,
                    options:
                      newField.type === "select"
                        ? (newField.options ?? "").split(",").map((s) => s.trim()).filter(Boolean)
                        : undefined,
                  });
                  setNewField({ name: "", type: "text" });
                }}
                newField={newField}
                setNewField={setNewField}
              />
            ) : (
              <div className="text-muted-foreground text-sm">Select a template.</div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TemplateEditor({
  template, onUpdate, onDelete, onRemoveField, onAddField, newField, setNewField,
}: {
  template: Template;
  onUpdate: (t: Template) => void;
  onDelete: () => void;
  onRemoveField: (fid: string) => void;
  onAddField: () => void;
  newField: { name: string; type: FieldType; target?: string; multi?: boolean; options?: string };
  setNewField: (v: typeof newField) => void;
}) {
  const { state } = useWorld();
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Input
          value={template.name}
          onChange={(e) => onUpdate({ ...template, name: e.target.value })}
          className="text-lg font-medium max-w-xs"
        />
        <Input
          type="color"
          value={template.color ?? "#999999"}
          onChange={(e) => onUpdate({ ...template, color: e.target.value })}
          className="w-14 h-9 p-1"
        />
        <Select value={template.icon} onValueChange={(v) => onUpdate({ ...template, icon: v })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-64">
            {ICON_CHOICES.map((n) => (
              <SelectItem key={n} value={n}>
                <div className="flex items-center gap-2"><Icon name={n} className="w-3.5 h-3.5" /> {n}</div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="sm" onClick={onDelete} className="ml-auto text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Fields</div>
        <div className="space-y-1">
          {template.fields.map((f) => (
            <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-border bg-card">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium">{f.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{f.type}{f.multi ? " · multi" : ""}</span>
              <button onClick={() => onRemoveField(f.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {template.fields.length === 0 && (
            <div className="text-sm text-muted-foreground italic">No fields yet.</div>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Add Field</div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Field name"
            value={newField.name}
            onChange={(e) => setNewField({ ...newField, name: e.target.value })}
          />
          <Select value={newField.type} onValueChange={(v: FieldType) => setNewField({ ...newField, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {newField.type === "select" && (
            <Input
              className="col-span-2"
              placeholder="Options (comma separated)"
              value={newField.options ?? ""}
              onChange={(e) => setNewField({ ...newField, options: e.target.value })}
            />
          )}
          {newField.type === "relationship" && (
            <>
              <Select
                value={newField.target ?? "__any"}
                onValueChange={(v) => setNewField({ ...newField, target: v === "__any" ? undefined : v })}
              >
                <SelectTrigger><SelectValue placeholder="Target template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any">Any template</SelectItem>
                  {state.templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select
                value={newField.multi ? "multi" : "single"}
                onValueChange={(v) => setNewField({ ...newField, multi: v === "multi" })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single link</SelectItem>
                  <SelectItem value="multi">Multiple links</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        <Button size="sm" className="mt-3" onClick={onAddField} disabled={!newField.name.trim()}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add Field
        </Button>
      </div>
    </div>
  );
}