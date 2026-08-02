import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { renderRichText } from "@/lib/worldbuilder/richFormat";
import { Eye, Edit3, Palette, Pipette, Rainbow, Copy, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { COLOR_CODE_LEGEND } from "@/lib/worldbuilder/richFormat";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function hexToCode(hex: string): string {
  const h = hex.replace("#", "").toUpperCase();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return "&x" + full.split("").map((c) => "&" + c).join("");
}

function lerpHex(a: string, b: string, t: number): string {
  const p = (s: string) => {
    const h = s.replace("#", "");
    const f = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
    return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
  };
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${mix(r1, r2)}${mix(g1, g2)}${mix(b1, b2)}`;
}

function gradientCode(text: string, stops: string[]): string {
  const chars = [...text];
  const colorAt = (i: number) => {
    if (stops.length === 1) return stops[0];
    const n = chars.length > 1 ? i / (chars.length - 1) : 0;
    const seg = Math.min(Math.floor(n * (stops.length - 1)), stops.length - 2);
    const local = (n - seg / (stops.length - 1)) * (stops.length - 1);
    return lerpHex(stops[seg], stops[seg + 1], Math.max(0, Math.min(1, local)));
  };
  let out = "";
  chars.forEach((ch, i) => {
    if (ch === " ") { out += ch; return; }
    out += hexToCode(colorAt(i)) + ch;
  });
  return out + "&r";
}

function useWikiClicks(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const a = t?.closest("a.wiki-link") as HTMLAnchorElement | null;
      if (!a) return;
      const id = a.getAttribute("data-doc-id");
      if (!id) return;
      e.preventDefault();
      window.dispatchEvent(new CustomEvent("void:open-doc", { detail: { id } }));
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [ref]);
}

interface Props {
  value?: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

// Strip legacy HTML on read: if legacy value is stored as HTML from the previous
// contentEditable field, convert basic tags to Markdown-ish before rendering.
function legacyHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<strong>([^<]*)<\/strong>/gi, "**$1**")
    .replace(/<b>([^<]*)<\/b>/gi, "**$1**")
    .replace(/<em>([^<]*)<\/em>/gi, "*$1*")
    .replace(/<i>([^<]*)<\/i>/gi, "*$1*")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function RichTextField({ value, onChange, readOnly, placeholder }: Props) {
  const [preview, setPreview] = useState(false);
  const [gradOpen, setGradOpen] = useState(false);
  const [gradText, setGradText] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const readRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  useWikiClicks(readRef);
  useWikiClicks(previewRef);

  const src = value ? legacyHtmlToText(value) : "";

  if (readOnly) {
    return (
      <div
        ref={readRef}
        className="prose prose-invert max-w-none text-foreground/90 leading-relaxed [&_p]:my-2 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/60 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_hr]:my-3 [&_hr]:border-border"
        dangerouslySetInnerHTML={{
          __html: src ? renderRichText(src) : `<p class="text-muted-foreground italic">Vazio</p>`,
        }}
      />
    );
  }

  const insert = (code: string) => {
    const ta = areaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const next = src.slice(0, start) + code + src.slice(end);
    onChange?.(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + code.length;
    });
  };

  // Wrap the current selection with before/after; if nothing is selected,
  // insert the placeholder and select it so the user can type over it.
  const wrap = (before: string, after: string, placeholder = "texto") => {
    const ta = areaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const selected = src.slice(start, end);
    const body = selected || placeholder;
    const next = src.slice(0, start) + before + body + after + src.slice(end);
    onChange?.(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = start + before.length + body.length;
    });
  };

  // Prefix line-based constructs (headings, lists, quotes) on the selection.
  const prefixLines = (prefix: string) => {
    const ta = areaRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const lineStart = src.lastIndexOf("\n", start - 1) + 1;
    const selected = src.slice(lineStart, end) || "item";
    const replaced = selected.split("\n").map((l) => prefix + l).join("\n");
    const next = src.slice(0, lineStart) + replaced + src.slice(end);
    onChange?.(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = lineStart + prefix.length;
      ta.selectionEnd = lineStart + replaced.length;
    });
  };

  const selectedText = () => {
    const ta = areaRef.current;
    if (!ta) return "";
    return src.slice(ta.selectionStart, ta.selectionEnd);
  };

  const applyColor = (hex: string) => wrap(hexToCode(hex), "&r");

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border/60">
        <button
          type="button"
          onClick={() => setPreview((v) => !v)}
          className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          {preview ? <><Edit3 className="w-3 h-3" /> Editar</> : <><Eye className="w-3 h-3" /> Visualizar</>}
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button type="button" onClick={() => wrap("**", "**")} className="text-xs px-1.5 py-1 rounded hover:bg-accent font-bold" title="Negrito">B</button>
        <button type="button" onClick={() => wrap("*", "*")} className="text-xs px-1.5 py-1 rounded hover:bg-accent italic" title="Itálico">I</button>
        <button type="button" onClick={() => wrap("&n", "&r")} className="text-xs px-1.5 py-1 rounded hover:bg-accent underline" title="Sublinhado">U</button>
        <button type="button" onClick={() => wrap("&m", "&r")} className="text-xs px-1.5 py-1 rounded hover:bg-accent line-through" title="Tachado">S</button>
        <button type="button" onClick={() => wrap("`", "`")} className="text-xs px-1.5 py-1 rounded hover:bg-accent font-mono" title="Código">{"</>"}</button>
        <button type="button" onClick={() => prefixLines("## ")} className="text-xs px-1.5 py-1 rounded hover:bg-accent" title="Cabeçalho">H</button>
        <button type="button" onClick={() => prefixLines("- ")} className="text-xs px-1.5 py-1 rounded hover:bg-accent" title="Lista">•</button>
        <button type="button" onClick={() => prefixLines("> ")} className="text-xs px-1.5 py-1 rounded hover:bg-accent" title="Citação">&gt;</button>
        <button type="button" onClick={() => wrap("[", "](https://)")} className="text-xs px-1.5 py-1 rounded hover:bg-accent" title="Link">🔗</button>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="text-xs px-1.5 py-1 rounded hover:bg-accent inline-flex items-center gap-1" title="Códigos de cor">
              <Palette className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cores</div>
            <div className="grid grid-cols-4 gap-1">
              {COLOR_CODE_LEGEND.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => wrap(c.code, "&r")}
                  className="flex items-center gap-1 text-[10px] px-1 py-1 rounded hover:bg-accent"
                  title={`${c.code} ${c.label}`}
                >
                  <span className="w-3 h-3 rounded" style={{ background: c.sample }} />
                  <span style={{ color: c.sample }}>{c.code}</span>
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">Use <code>&amp;r</code> para redefinir. Também: <code>&amp;l</code> negrito, <code>&amp;o</code> itálico, <code>&amp;n</code> sublinhado.</div>
          </PopoverContent>
        </Popover>
        <ColorPickerButton onApply={applyColor} />
        <button
          type="button"
          onClick={() => { setGradText(selectedText()); setGradOpen(true); }}
          className="text-xs px-1.5 py-1 rounded hover:bg-accent inline-flex items-center gap-1"
          title="Gradiente HEX"
        >
          <Rainbow className="w-3 h-3" />
        </button>
      </div>
      <GradientDialog
        open={gradOpen}
        onOpenChange={setGradOpen}
        text={gradText}
        setText={setGradText}
        onInsert={(code) => {
          const ta = areaRef.current;
          const start = ta ? ta.selectionStart : src.length;
          const end = ta ? ta.selectionEnd : src.length;
          const next = src.slice(0, start) + code + src.slice(end);
          onChange?.(next);
          setGradOpen(false);
          requestAnimationFrame(() => {
            ta?.focus();
            if (ta) ta.selectionStart = ta.selectionEnd = start + code.length;
          });
        }}
      />
      {preview ? (
        <div
          ref={previewRef}
          className="prose prose-invert max-w-none px-3 py-2 text-sm min-h-[120px] [&_p]:my-2 [&_h1]:text-2xl [&_h2]:text-xl [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/60 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: renderRichText(src) || `<p class="text-muted-foreground italic">Vazio</p>` }}
        />
      ) : (
        <textarea
          ref={areaRef}
          value={src}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder ?? "Escreva… Markdown + códigos &1..&f suportados."}
          className={cn(
            "block w-full min-h-[140px] resize-y bg-transparent px-3 py-2 text-sm leading-relaxed font-mono",
            "focus:outline-none",
          )}
        />
      )}
    </div>
  );
}
function ColorPickerButton({ onApply }: { onApply: (hex: string) => void }) {
  const [hex, setHex] = useState("#7dd3fc");
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="text-xs px-1.5 py-1 rounded hover:bg-accent inline-flex items-center gap-1" title="Cor HEX personalizada">
          <Pipette className="w-3 h-3" />
          <span className="w-3 h-3 rounded border border-border" style={{ background: hex }} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Cor personalizada</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={/^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#ffffff"}
            onChange={(e) => setHex(e.target.value)}
            className="h-8 w-10 rounded bg-transparent border border-border cursor-pointer"
          />
          <Input value={hex} onChange={(e) => setHex(e.target.value)} className="h-8 text-xs font-mono" />
        </div>
        <div className="text-[10px] text-muted-foreground font-mono break-all">{hexToCode(hex)}</div>
        <Button size="sm" className="w-full h-7 text-xs" onClick={() => onApply(hex)}>
          Aplicar à seleção
        </Button>
      </PopoverContent>
    </Popover>
  );
}

interface GradProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  text: string;
  setText: (v: string) => void;
  onInsert: (code: string) => void;
}

function GradientDialog({ open, onOpenChange, text, setText, onInsert }: GradProps) {
  const [stops, setStops] = useState<string[]>(["#22d3ee", "#a855f7"]);
  const [copied, setCopied] = useState(false);
  const body = text || "Texto do gradiente";
  const code = gradientCode(body, stops);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // fallback
    }
  };

  const setStop = (i: number, v: string) => setStops((s) => s.map((c, j) => (j === i ? v : c)));
  const addStop = () => setStops((s) => [...s, s[s.length - 1]]);
  const removeStop = (i: number) => setStops((s) => (s.length > 2 ? s.filter((_, j) => j !== i) : s));


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Gradiente HEX</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Texto</div>
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva o texto…" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Cores</div>
            <div className="flex flex-wrap items-center gap-2">
              {stops.map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    type="color"
                    value={/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#ffffff"}
                    onChange={(e) => setStop(i, e.target.value)}
                    className="h-8 w-9 rounded bg-transparent border border-border cursor-pointer"
                  />
                  <Input value={c} onChange={(e) => setStop(i, e.target.value)} className="h-8 w-24 text-xs font-mono" />
                  {stops.length > 2 && (
                    <button type="button" onClick={() => removeStop(i)} className="text-xs text-muted-foreground hover:text-destructive px-1">×</button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={addStop}>+ Cor</Button>
            </div>
          </div>
          <div
            className="h-2 rounded"
            style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}
          />
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Prévia</div>
            <div
              className="rounded border border-border px-3 py-2 text-sm"
              dangerouslySetInnerHTML={{ __html: renderRichText(code) }}
            />
          </div>
          <div className="text-[10px] font-mono text-muted-foreground break-all max-h-20 overflow-auto">{code}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onInsert(code)}>Inserir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
