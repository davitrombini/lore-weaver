import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorld } from "@/lib/worldbuilder/store";
import { renderRichText } from "@/lib/worldbuilder/richFormat";
import { askAssistant } from "@/lib/api/ai.functions";
import type { FieldDef, FieldType, Template } from "@/lib/worldbuilder/types";
import { toast } from "sonner";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface ActionTemplate {
  type: "createTemplate";
  name: string;
  icon?: string;
  parentName?: string;
  fields?: { name: string; type: FieldType; options?: string[] }[];
}
interface ActionDocument {
  type: "createDocument";
  templateName: string;
  title: string;
  values?: Record<string, unknown>;
}
type Action = ActionTemplate | ActionDocument;

const FIELD_TYPES: FieldType[] = [
  "text", "richtext", "number", "select", "boolean", "date", "image", "relationship", "table",
];

function extractActions(text: string): { clean: string; actions: Action[] } {
  const re = /```void-action\s*([\s\S]*?)```/gi;
  const actions: Action[] = [];
  let clean = text;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    try {
      const parsed = JSON.parse(m[1].trim()) as { actions?: Action[] };
      if (Array.isArray(parsed.actions)) actions.push(...parsed.actions);
    } catch {
      // ignore malformed blocks
    }
  }
  clean = text.replace(re, "").trim();
  return { clean, actions };
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function AssistantPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, createTemplate, updateTemplate, createDocument, updateDocument } = useWorld();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente do Void. Posso ler seus documentos e categorias, sugerir ideias e até **criar templates e documentos** para você. O que vamos construir?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Action[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = () => {
    const templates = state.templates.map((t) => ({
      name: t.name,
      parent: state.templates.find((p) => p.id === t.parentId)?.name ?? null,
      fields: t.fields.map((f) => ({ name: f.name, type: f.type, options: f.options })),
    }));
    const documents = state.documents
      .filter((d) => !d.deletedAt)
      .slice(0, 120)
      .map((d) => {
        const tpl = state.templates.find((t) => t.id === d.templateId);
        const values: Record<string, unknown> = {};
        tpl?.fields.forEach((f) => {
          const v = d.values[f.id];
          if (v === undefined || v === null || v === "") return;
          values[f.name] = typeof v === "string" ? v.slice(0, 800) : v;
        });
        return { titulo: d.title, categoria: tpl?.name ?? "?", valores: values };
      });
    return JSON.stringify({ templates, documents }).slice(0, 55000);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await askAssistant({
        data: { messages: next.slice(-16), context: buildContext() },
      });
      const { clean, actions } = extractActions(res.text ?? "");
      setMessages((m) => [...m, { role: "assistant", content: clean || "(sem resposta)" }]);
      if (actions.length) setPending(actions);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao falar com a IA");
      setMessages((m) => [...m, { role: "assistant", content: "⚠️ Não consegui responder agora." }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const applyActions = () => {
    const created = new Map<string, Template>();
    const findTpl = (name: string) =>
      created.get(name.toLowerCase()) ??
      state.templates.find((t) => t.name.toLowerCase() === name.toLowerCase());

    let tplCount = 0;
    let docCount = 0;

    for (const a of pending) {
      if (a.type === "createTemplate") {
        const parent = a.parentName ? findTpl(a.parentName)?.id ?? null : null;
        const base = createTemplate(a.name, a.icon || "FileText", parent);
        const fields: FieldDef[] = (a.fields ?? [])
          .filter((f) => f?.name)
          .map((f) => ({
            id: "f_" + uid(),
            name: f.name,
            type: FIELD_TYPES.includes(f.type) ? f.type : "text",
            ...(f.options ? { options: f.options } : {}),
          }));
        const full: Template = { ...base, fields };
        updateTemplate(full);
        created.set(a.name.toLowerCase(), full);
        tplCount++;
      } else if (a.type === "createDocument") {
        const tpl = findTpl(a.templateName);
        if (!tpl) continue;
        const doc = createDocument(tpl.id, a.title || "Sem título");
        const values: Record<string, unknown> = {};
        Object.entries(a.values ?? {}).forEach(([k, v]) => {
          const f = tpl.fields.find((ff) => ff.name.toLowerCase() === k.toLowerCase());
          if (f) values[f.id] = v;
        });
        updateDocument(doc.id, { values, updatedAt: Date.now() });
        docCount++;
      }
    }
    setPending([]);
    toast.success(`Aplicado: ${tplCount} categoria(s), ${docCount} documento(s).`);
  };

  if (!open) return null;

  return (
    <aside className="w-96 shrink-0 h-full border-l border-sidebar-border bg-sidebar flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Assistente IA</span>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="ml-auto p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-6 rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-sm whitespace-pre-wrap"
                : "mr-2 rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm"
            }
          >
            {m.role === "user" ? (
              m.content
            ) : (
              <div
                className="prose prose-invert max-w-none text-sm [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{ __html: renderRichText(m.content) }}
              />
            )}
          </div>
        ))}
        {loading && (
          <div className="mr-2 rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm text-muted-foreground inline-flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Pensando…
          </div>
        )}
        {pending.length > 0 && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 space-y-2">
            <div className="text-xs font-medium flex items-center gap-1">
              <Wand2 className="w-3.5 h-3.5" /> Ações sugeridas
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {pending.map((a, i) => (
                <li key={i}>
                  {a.type === "createTemplate"
                    ? `Criar categoria “${a.name}” (${a.fields?.length ?? 0} campos)`
                    : `Criar documento “${a.title}” em ${a.templateName}`}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={applyActions}>Aplicar</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPending([])}>
                Descartar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-sidebar-border p-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          placeholder="Peça ideias, revisões ou diga: crie uma categoria de Facções…"
          className="w-full resize-none bg-background border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex justify-end mt-1">
          <Button size="sm" className="h-7 text-xs" disabled={loading || !input.trim()} onClick={() => void send()}>
            <Send className="w-3.5 h-3.5 mr-1" /> Enviar
          </Button>
        </div>
      </div>
    </aside>
  );
}