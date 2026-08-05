import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot, Send, X, Sparkles, Wand2, Plus, Trash2, MessageSquare, Pencil, Undo2, Redo2, Link2, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWorld } from "@/lib/worldbuilder/store";
import { renderRichText } from "@/lib/worldbuilder/richFormat";
import { askAssistant, generateDocImage } from "@/lib/api/ai.functions";
import type { FieldDef, FieldType, Template, WorkspaceState } from "@/lib/worldbuilder/types";
import { toast } from "sonner";
import { Icon } from "./icons";

interface Msg {
  role: "user" | "assistant";
  content: string;
}
interface Chat {
  id: string;
  title: string;
  messages: Msg[];
}

interface ActionTemplate {
  type: "createTemplate";
  name: string;
  icon?: string;
  color?: string;
  textColor?: string;
  bgColor?: string;
  parentName?: string;
  fields?: { name: string; type: FieldType; options?: string[] }[];
}
interface ActionStyle {
  type: "styleTemplate";
  name: string;
  icon?: string;
  color?: string;
  textColor?: string;
  bgColor?: string;
}
interface ActionDocument {
  type: "createDocument";
  templateName: string;
  title: string;
  icon?: string;
  values?: Record<string, unknown>;
}
interface ActionFields {
  type: "updateTemplateFields";
  name: string;
  addFields?: { name: string; type: FieldType; options?: string[] }[];
  updateFields?: { name: string; newName?: string; type?: FieldType; options?: string[] }[];
  removeFields?: string[];
}
interface ActionImage {
  type: "generateImage";
  documentTitle: string;
  fieldName?: string;
  prompt: string;
}
type Action = ActionTemplate | ActionStyle | ActionDocument | ActionFields | ActionImage;

const FIELD_TYPES: FieldType[] = [
  "text", "richtext", "number", "select", "boolean", "date", "image", "relationship", "table",
];

const STORE_KEY = "void_ai_chats";
const uid = () => Math.random().toString(36).slice(2, 10);

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Olá! Sou o assistente do Void. Posso ler seus documentos e categorias, sugerir ideias e até **criar templates e documentos** para você. O que vamos construir?",
};

function newChat(): Chat {
  return { id: uid(), title: "Nova conversa", messages: [WELCOME] };
}

function loadChats(): Chat[] {
  if (typeof window === "undefined") return [newChat()];
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Chat[]) : [];
    return Array.isArray(parsed) && parsed.length ? parsed : [newChat()];
  } catch {
    return [newChat()];
  }
}

function extractActions(text: string): { clean: string; actions: Action[] } {
  const re = /```void-action\s*([\s\S]*?)```/gi;
  const actions: Action[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    try {
      const parsed = JSON.parse(m[1].trim()) as { actions?: Action[] };
      if (Array.isArray(parsed.actions)) actions.push(...parsed.actions);
    } catch {
      // ignore malformed blocks
    }
  }
  return { clean: text.replace(re, "").trim(), actions };
}

export function AssistantPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, createTemplate, updateTemplate, createDocument, updateDocument, replaceState } = useWorld();
  const [chats, setChats] = useState<Chat[]>(loadChats);
  const [activeId, setActiveId] = useState<string>(() => chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Action[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [bindOpen, setBindOpen] = useState(false);
  const [boundTemplates, setBoundTemplates] = useState<string[]>([]);
  const [boundDocs, setBoundDocs] = useState<string[]>([]);
  const [undoStack, setUndoStack] = useState<WorkspaceState[]>([]);
  const [redoStack, setRedoStack] = useState<WorkspaceState[]>([]);
  const [generating, setGenerating] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chat = useMemo(() => chats.find((c) => c.id === activeId) ?? chats[0], [chats, activeId]);
  const messages = chat.messages;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(chats));
    } catch { /* storage full */ }
  }, [chats]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const setMessages = useCallback(
    (updater: (m: Msg[]) => Msg[]) =>
      setChats((cs) => cs.map((c) => (c.id === activeId ? { ...c, messages: updater(c.messages) } : c))),
    [activeId],
  );

  const buildContext = () => {
    const useTpl = state.templates.filter(
      (t) => !t.deletedAt && (!boundTemplates.length || boundTemplates.includes(t.id)),
    );
    const templates = useTpl.map((t) => ({
      name: t.name,
      parent: state.templates.find((p) => p.id === t.parentId)?.name ?? null,
      cores: { icone: t.color, texto: t.textColor, fundo: t.bgColor },
      fields: t.fields.map((f) => ({ name: f.name, type: f.type, options: f.options })),
    }));
    const tplIds = new Set(useTpl.map((t) => t.id));
    const documents = state.documents
      .filter((d) => !d.deletedAt && tplIds.has(d.templateId))
      .filter((d) => !boundDocs.length || boundDocs.includes(d.id))
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

  const run = async (history: Msg[]) => {
    setLoading(true);
    try {
      const res = await askAssistant({ data: { messages: history.slice(-16), context: buildContext() } });
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

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setChats((cs) =>
      cs.map((c) =>
        c.id === activeId
          ? { ...c, messages: next, title: c.title === "Nova conversa" ? text.slice(0, 40) : c.title }
          : c,
      ),
    );
    setInput("");
    await run(next);
  };

  const saveEdit = async (idx: number) => {
    const text = editText.trim();
    if (!text) return;
    const next = [...messages.slice(0, idx), { role: "user" as const, content: text }];
    setChats((cs) => cs.map((c) => (c.id === activeId ? { ...c, messages: next } : c)));
    setEditingIdx(null);
    await run(next);
  };

  const applyActions = async () => {
    setUndoStack((s) => [...s.slice(-9), state]);
    setRedoStack([]);
    const created = new Map<string, Template>();
    const findTpl = (name: string) =>
      created.get(name.toLowerCase()) ??
      state.templates.find((t) => !t.deletedAt && t.name.toLowerCase() === name.toLowerCase());

    let tplCount = 0;
    let docCount = 0;
    let styleCount = 0;
    let fieldCount = 0;
    let imgCount = 0;
    const imageJobs: ActionImage[] = [];
    const createdDocs = new Map<string, string>();

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
        const full: Template = {
          ...base,
          fields,
          ...(a.color ? { color: a.color } : {}),
          ...(a.textColor ? { textColor: a.textColor } : {}),
          ...(a.bgColor ? { bgColor: a.bgColor } : {}),
        };
        updateTemplate(full);
        created.set(a.name.toLowerCase(), full);
        tplCount++;
      } else if (a.type === "styleTemplate") {
        const tpl = findTpl(a.name);
        if (!tpl) continue;
        const full: Template = {
          ...tpl,
          ...(a.icon ? { icon: a.icon } : {}),
          ...(a.color ? { color: a.color } : {}),
          ...(a.textColor ? { textColor: a.textColor } : {}),
          ...(a.bgColor ? { bgColor: a.bgColor } : {}),
        };
        updateTemplate(full);
        created.set(tpl.name.toLowerCase(), full);
        styleCount++;
      } else if (a.type === "createDocument") {
        const tpl = findTpl(a.templateName);
        if (!tpl) continue;
        const doc = createDocument(tpl.id, a.title || "Sem título");
        const values: Record<string, unknown> = {};
        Object.entries(a.values ?? {}).forEach(([k, v]) => {
          const f = tpl.fields.find((ff) => ff.name.toLowerCase() === k.toLowerCase());
          if (f) values[f.id] = v;
        });
        updateDocument(doc.id, { values, updatedAt: Date.now(), ...(a.icon ? { icon: a.icon } : {}) });
        docCount++;
        createdDocs.set((a.title || "").toLowerCase(), doc.id);
      } else if (a.type === "updateTemplateFields") {
        const tpl = findTpl(a.name);
        if (!tpl) continue;
        let fields = [...tpl.fields];
        for (const rm of a.removeFields ?? []) {
          fields = fields.filter((f) => f.name.toLowerCase() !== rm.toLowerCase());
        }
        for (const up of a.updateFields ?? []) {
          fields = fields.map((f) =>
            f.name.toLowerCase() === up.name.toLowerCase()
              ? {
                  ...f,
                  ...(up.newName ? { name: up.newName } : {}),
                  ...(up.type && FIELD_TYPES.includes(up.type) ? { type: up.type } : {}),
                  ...(up.options ? { options: up.options } : {}),
                }
              : f,
          );
        }
        for (const add of a.addFields ?? []) {
          if (!add?.name) continue;
          if (fields.some((f) => f.name.toLowerCase() === add.name.toLowerCase())) continue;
          fields.push({
            id: "f_" + uid(),
            name: add.name,
            type: FIELD_TYPES.includes(add.type) ? add.type : "text",
            ...(add.options ? { options: add.options } : {}),
          });
        }
        const full: Template = { ...tpl, fields };
        updateTemplate(full);
        created.set(tpl.name.toLowerCase(), full);
        fieldCount++;
      } else if (a.type === "generateImage") {
        imageJobs.push(a);
      }
    }
    setPending([]);

    for (const job of imageJobs) {
      const key = (job.documentTitle || "").toLowerCase();
      const docId =
        createdDocs.get(key) ??
        state.documents.find((d) => !d.deletedAt && d.title.toLowerCase() === key)?.id;
      if (!docId) continue;
      const doc = state.documents.find((d) => d.id === docId);
      const tpl =
        created.get(
          (state.templates.find((t) => t.id === doc?.templateId)?.name ?? "").toLowerCase(),
        ) ?? state.templates.find((t) => t.id === doc?.templateId);
      if (!tpl) continue;
      let field = job.fieldName
        ? tpl.fields.find((f) => f.type === "image" && f.name.toLowerCase() === job.fieldName!.toLowerCase())
        : undefined;
      field ??= tpl.fields.find((f) => f.type === "image");
      if (!field) {
        field = { id: "f_" + uid(), name: job.fieldName || "Imagem", type: "image" };
        const full: Template = { ...tpl, fields: [...tpl.fields, field] };
        updateTemplate(full);
        created.set(tpl.name.toLowerCase(), full);
      }
      setGenerating((g) => [...g, job.documentTitle]);
      try {
        const { dataUrl } = await generateDocImage({ data: { prompt: job.prompt } });
        const current = state.documents.find((d) => d.id === docId);
        updateDocument(docId, {
          values: { ...(current?.values ?? {}), [field.id]: dataUrl },
          updatedAt: Date.now(),
        });
        imgCount++;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao gerar imagem");
      } finally {
        setGenerating((g) => g.filter((x) => x !== job.documentTitle));
      }
    }

    toast.success(
      `Aplicado: ${tplCount} categoria(s), ${styleCount} estilo(s), ${fieldCount} edição(ões) de campos, ${docCount} documento(s), ${imgCount} imagem(ns).`,
    );
  };

  const undoAi = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, state]);
    replaceState(prev);
    toast.success("Ações da IA desfeitas.");
  };
  const redoAi = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, state]);
    replaceState(next);
    toast.success("Ações da IA refeitas.");
  };

  const toggle = (arr: string[], id: string, set: (v: string[]) => void) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  if (!open) return null;

  const boundCount = boundTemplates.length + boundDocs.length;
  const liveTemplates = state.templates.filter((t) => !t.deletedAt);

  return (
    <aside className="relative z-30 w-96 shrink-0 h-full border-l border-sidebar-border bg-sidebar flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-sidebar-border">
        <Bot className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Assistente IA</span>
        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button" onClick={undoAi} disabled={!undoStack.length} title="Desfazer ações da IA"
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30"
          ><Undo2 className="w-4 h-4" /></button>
          <button
            type="button" onClick={redoAi} disabled={!redoStack.length} title="Refazer ações da IA"
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-30"
          ><Redo2 className="w-4 h-4" /></button>
          <button
            type="button" onClick={() => onOpenChange(false)} title="Fechar"
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          ><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Chats */}
      <div className="border-b border-sidebar-border px-2 py-2 space-y-1 max-h-40 overflow-y-auto">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Conversas</span>
          <Button
            size="sm" variant="outline" className="h-6 text-[11px] ml-auto gap-1"
            onClick={() => { const c = newChat(); setChats((cs) => [c, ...cs]); setActiveId(c.id); setPending([]); }}
          ><Plus className="w-3 h-3" /> Nova</Button>
        </div>
        {chats.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-1 rounded px-1.5 py-1 text-xs ${c.id === activeId ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-accent"}`}
          >
            <MessageSquare className="w-3 h-3 shrink-0" />
            <button className="flex-1 text-left truncate" onClick={() => { setActiveId(c.id); setPending([]); }}>
              {c.title}
            </button>
            <button
              title="Excluir conversa"
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive"
              onClick={() => {
                setChats((cs) => {
                  const rest = cs.filter((x) => x.id !== c.id);
                  const finalList = rest.length ? rest : [newChat()];
                  if (c.id === activeId) setActiveId(finalList[0].id);
                  return finalList;
                });
              }}
            ><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>

      {/* Context binding */}
      <div className="border-b border-sidebar-border px-2 py-1.5">
        <button
          onClick={() => setBindOpen((v) => !v)}
          className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <Link2 className="w-3.5 h-3.5" />
          Contexto vinculado {boundCount ? `(${boundCount})` : "(tudo)"}
        </button>
        {bindOpen && (
          <div className="mt-2 max-h-52 overflow-y-auto space-y-1 pr-1">
            {liveTemplates.map((t) => (
              <div key={t.id}>
                <button
                  onClick={() => toggle(boundTemplates, t.id, setBoundTemplates)}
                  className="w-full flex items-center gap-1.5 text-xs px-1 py-0.5 rounded hover:bg-accent"
                >
                  <span className="w-3">{boundTemplates.includes(t.id) && <Check className="w-3 h-3 text-primary" />}</span>
                  <Icon name={t.icon} className="w-3 h-3" style={{ color: t.color }} />
                  <span className="truncate">{t.name}</span>
                </button>
                {state.documents.filter((d) => !d.deletedAt && d.templateId === t.id).map((d) => (
                  <button
                    key={d.id}
                    onClick={() => toggle(boundDocs, d.id, setBoundDocs)}
                    className="w-full flex items-center gap-1.5 text-[11px] pl-6 pr-1 py-0.5 rounded hover:bg-accent text-muted-foreground"
                  >
                    <span className="w-3">{boundDocs.includes(d.id) && <Check className="w-3 h-3 text-primary" />}</span>
                    <span className="truncate">{d.title}</span>
                  </button>
                ))}
              </div>
            ))}
            {boundCount > 0 && (
              <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={() => { setBoundTemplates([]); setBoundDocs([]); }}>
                Limpar vínculos
              </Button>
            )}
          </div>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "group ml-6 rounded-lg bg-primary/15 border border-primary/30 px-3 py-2 text-sm whitespace-pre-wrap relative"
                : "mr-2 rounded-lg bg-muted/50 border border-border px-3 py-2 text-sm"
            }
          >
            {m.role === "user" ? (
              editingIdx === i ? (
                <div className="space-y-1">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={3}
                    className="w-full resize-none bg-background border border-input rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" className="h-6 text-[11px]" onClick={() => setEditingIdx(null)}>Cancelar</Button>
                    <Button size="sm" className="h-6 text-[11px]" onClick={() => void saveEdit(i)}>Salvar e reenviar</Button>
                  </div>
                </div>
              ) : (
                <>
                  {m.content}
                  <button
                    title="Editar mensagem"
                    onClick={() => { setEditingIdx(i); setEditText(m.content); }}
                    className="absolute -left-5 top-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                  ><Pencil className="w-3.5 h-3.5" /></button>
                </>
              )
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
                    : a.type === "styleTemplate"
                      ? `Estilizar categoria “${a.name}”`
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
