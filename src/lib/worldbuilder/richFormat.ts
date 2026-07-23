// Lightweight Markdown + Minecraft-style color code parser.
// Codes like &1..&f color text until the next &r or end of line.
// Also supports very light Markdown: headings, bold, italic, code,
// links, blockquotes, unordered/ordered lists and paragraphs.

const COLOR_MAP: Record<string, string> = {
  "0": "#000000", "1": "#1e40af", "2": "#15803d", "3": "#0e7490",
  "4": "#991b1b", "5": "#7e22ce", "6": "#d97706", "7": "#9ca3af",
  "8": "#4b5563", "9": "#3b82f6", "a": "#22c55e", "b": "#22d3ee",
  "c": "#ef4444", "d": "#ec4899", "e": "#facc15", "f": "#f8fafc",
  "l": "__BOLD__", "o": "__ITALIC__", "n": "__UNDERLINE__", "m": "__STRIKE__",
};

function escape(s: string) {
  return s
    .replace(/&(?![0-9a-frlonm])/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function applyColorCodes(line: string): string {
  // Split on any &X code (0-9a-f, r, l, o, n, m)
  let out = "";
  let openSpans = 0;
  let openFmt: string[] = [];
  const parts = line.split(/(&[0-9a-frlonm])/g);
  const closeAll = () => {
    while (openFmt.length) { out += `</${openFmt.pop()}>`; }
    while (openSpans > 0) { out += "</span>"; openSpans--; }
  };
  for (const p of parts) {
    if (/^&[0-9a-f]$/.test(p)) {
      closeAll();
      out += `<span style="color:${COLOR_MAP[p[1]]}">`;
      openSpans++;
    } else if (p === "&r") {
      closeAll();
    } else if (p === "&l") { out += "<strong>"; openFmt.push("strong"); }
    else if (p === "&o") { out += "<em>"; openFmt.push("em"); }
    else if (p === "&n") { out += "<u>"; openFmt.push("u"); }
    else if (p === "&m") { out += "<s>"; openFmt.push("s"); }
    else {
      out += p;
    }
  }
  closeAll();
  return out;
}

function inlineMd(s: string): string {
  // bold, italic, code, links — process on already-escaped, then apply colors
  let t = s
    .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = applyColorCodes(t);
  return t;
}

export function renderRichText(src: string): string {
  if (!src) return "";
  // If the value already looks like HTML (from legacy contentEditable saves), keep it.
  const looksHtml = /<(p|div|br|span|strong|em|h1|h2|h3|ul|ol|li|img|a)\b/i.test(src);
  const raw = looksHtml ? src.replace(/<[^>]+>/g, (t) => t) : escape(src);
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  let inList: "ul" | "ol" | null = null;
  const closeList = () => { if (inList) { out.push(`</${inList}>`); inList = null; } };
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { closeList(); continue; }
    // Headings
    let m: RegExpMatchArray | null;
    if ((m = trimmed.match(/^(#{1,3})\s+(.*)$/))) {
      closeList();
      const lvl = m[1].length;
      out.push(`<h${lvl}>${inlineMd(m[2])}</h${lvl}>`);
      continue;
    }
    if (trimmed.startsWith("> ")) {
      closeList();
      out.push(`<blockquote>${inlineMd(trimmed.slice(2))}</blockquote>`);
      continue;
    }
    if ((m = trimmed.match(/^[-*]\s+(.*)$/))) {
      if (inList !== "ul") { closeList(); out.push("<ul>"); inList = "ul"; }
      out.push(`<li>${inlineMd(m[1])}</li>`);
      continue;
    }
    if ((m = trimmed.match(/^\d+\.\s+(.*)$/))) {
      if (inList !== "ol") { closeList(); out.push("<ol>"); inList = "ol"; }
      out.push(`<li>${inlineMd(m[1])}</li>`);
      continue;
    }
    if (trimmed === "---" || trimmed === "***") { closeList(); out.push("<hr />"); continue; }
    closeList();
    out.push(`<p>${inlineMd(line)}</p>`);
  }
  closeList();
  return out.join("\n");
}

export const COLOR_CODE_LEGEND: { code: string; label: string; sample: string }[] = [
  { code: "&0", label: "Preto", sample: COLOR_MAP["0"] },
  { code: "&1", label: "Azul Escuro", sample: COLOR_MAP["1"] },
  { code: "&2", label: "Verde Escuro", sample: COLOR_MAP["2"] },
  { code: "&3", label: "Ciano Escuro", sample: COLOR_MAP["3"] },
  { code: "&4", label: "Vermelho Escuro", sample: COLOR_MAP["4"] },
  { code: "&5", label: "Roxo", sample: COLOR_MAP["5"] },
  { code: "&6", label: "Dourado", sample: COLOR_MAP["6"] },
  { code: "&7", label: "Cinza", sample: COLOR_MAP["7"] },
  { code: "&8", label: "Cinza Escuro", sample: COLOR_MAP["8"] },
  { code: "&9", label: "Azul", sample: COLOR_MAP["9"] },
  { code: "&a", label: "Verde", sample: COLOR_MAP["a"] },
  { code: "&b", label: "Aqua", sample: COLOR_MAP["b"] },
  { code: "&c", label: "Vermelho", sample: COLOR_MAP["c"] },
  { code: "&d", label: "Rosa", sample: COLOR_MAP["d"] },
  { code: "&e", label: "Amarelo", sample: COLOR_MAP["e"] },
  { code: "&f", label: "Branco", sample: COLOR_MAP["f"] },
];
