import { useMemo, useState } from "react";
import { Edit3, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorld } from "@/lib/worldbuilder/store";
import { Icon } from "./icons";
import { ImageField } from "./ImageField";
import { RelationshipField } from "./RelationshipField";
import { RichTextField } from "./RichTextField";
import type { DocumentEntry, FieldDef, Template } from "@/lib/worldbuilder/types";
import { motion, AnimatePresence } from "framer-motion";

function FieldEditor({
  field, value, onChange, docId,
}: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; docId: string }) {
  switch (field.type) {
    case "text":
      return <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "number":
      return (
        <Input
          type="number"
          value={(value as number | undefined) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
      );
    case "date":
      return <Input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "boolean":
      return <Switch checked={!!value} onCheckedChange={onChange} />;
    case "select":
      return (
        <Select value={(value as string) ?? ""} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Escolher…" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "richtext":
      return <RichTextField value={value as string} onChange={(v) => onChange(v)} />;
    case "image":
      return <ImageField value={value as string} onChange={(v) => onChange(v)} />;
    case "relationship":
      return (
        <RelationshipField
          value={value as string | string[] | undefined}
          multi={field.multi}
          targetTemplateId={field.targetTemplateId}
          excludeId={docId}
          onChange={onChange}
        />
      );
  }
}

function FieldReader({ field, value, onOpen }: { field: FieldDef; value: unknown; onOpen: (id: string) => void }) {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && !value.length)) {
    if (field.type !== "boolean") return <div className="text-sm text-muted-foreground italic">Empty</div>;
  }
  switch (field.type) {
    case "text":
    case "number":
      return <div className="text-foreground/90">{String(value)}</div>;
    case "date":
      return <div className="text-foreground/90 tabular-nums">{String(value)}</div>;
    case "boolean":
      return (
        <div className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${value ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
          {value ? "Yes" : "No"}
        </div>
      );
    case "select":
      return <div className="inline-flex px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-sm">{String(value)}</div>;
    case "richtext":
      return <RichTextField value={value as string} readOnly />;
    case "image":
      return <ImageField value={value as string} onChange={() => {}} readOnly />;
    case "relationship":
      return (
        <RelationshipField
          value={value as string | string[]}
          multi={field.multi}
          targetTemplateId={field.targetTemplateId}
          onChange={() => {}}
          onOpenDocument={onOpen}
          readOnly
        />
      );
  }
}

export function DocumentView({ doc }: { doc: DocumentEntry }) {
  const { state, updateDocument, deleteDocument, openTab } = useWorld();
  const tpl = state.templates.find((t) => t.id === doc.templateId) as Template | undefined;
  const [edit, setEdit] = useState(false);

  const heroImageField = useMemo(() => tpl?.fields.find((f) => f.type === "image"), [tpl]);
  const heroImage = heroImageField ? (doc.values[heroImageField.id] as string | undefined) : undefined;

  if (!tpl) return <div className="p-8 text-muted-foreground">Template missing.</div>;

  const setValue = (fid: string, v: unknown) =>
    updateDocument(doc.id, { values: { ...doc.values, [fid]: v } });

  return (
    <div className="h-full overflow-auto">
      {/* Hero */}
      <div className="relative">
        {heroImage ? (
          <div className="h-56 w-full overflow-hidden border-b border-border">
            <img src={heroImage} alt="" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-accent/40 via-background to-background border-b border-border" />
        )}
      </div>

      <div className="max-w-3xl mx-auto px-8 -mt-16 relative pb-24">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center border border-border shadow-lg"
              style={{ background: `linear-gradient(135deg, ${tpl.color ?? "var(--primary)"}40, transparent)` }}
            >
              <Icon name={tpl.icon} className="w-6 h-6" style={{ color: tpl.color }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{tpl.name}</div>
              {edit ? (
                <Input
                  value={doc.title}
                  onChange={(e) => updateDocument(doc.id, { title: e.target.value })}
                  className="text-2xl font-semibold h-auto py-1 px-2 -ml-2 mt-1 bg-transparent border-dashed"
                />
              ) : (
                <h1 className="text-3xl font-semibold tracking-tight truncate">{doc.title}</h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={edit ? "default" : "secondary"}
              size="sm"
              onClick={() => setEdit((v) => !v)}
              className="gap-2"
            >
              {edit ? <><Eye className="w-4 h-4" /> Read</> : <><Edit3 className="w-4 h-4" /> Edit</>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm(`Delete "${doc.title}"?`)) deleteDocument(doc.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={edit ? "edit" : "read"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-6"
          >
            {tpl.fields.length === 0 && (
              <div className="text-sm text-muted-foreground border border-dashed border-border rounded-lg p-6 text-center">
                This template has no fields yet. Add fields in the Template Manager.
              </div>
            )}
            {tpl.fields.map((f) => (
              <div key={f.id} className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {f.name}
                </div>
                {edit ? (
                  <FieldEditor field={f} value={doc.values[f.id]} onChange={(v) => setValue(f.id, v)} docId={doc.id} />
                ) : (
                  <FieldReader field={f} value={doc.values[f.id]} onOpen={openTab} />
                )}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}