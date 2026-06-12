import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange: (v: string | undefined) => void;
  readOnly?: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export function ImageField({ value, onChange, readOnly }: Props) {
  const [drag, setDrag] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[] | null | undefined) => {
      if (!files || !files.length) return;
      const f = Array.from(files).find((x) => x.type.startsWith("image/"));
      if (!f) return;
      const url = await fileToDataUrl(f);
      onChange(url);
    },
    [onChange],
  );

  useEffect(() => {
    if (readOnly) return;
    const el = ref.current;
    if (!el) return;
    const onPaste = async (e: ClipboardEvent) => {
      if (!el.matches(":hover") && document.activeElement !== el) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) await handleFiles([f]);
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleFiles, readOnly]);

  if (readOnly) {
    if (!value) return <div className="text-sm text-muted-foreground italic">No image</div>;
    return (
      <img
        src={value}
        alt=""
        className="rounded-lg max-h-96 object-cover border border-border"
      />
    );
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setDrag(false);
        await handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative group rounded-lg border-2 border-dashed border-border bg-muted/30 transition-all cursor-pointer outline-none",
        "hover:border-primary/50 focus:border-primary",
        drag && "border-primary bg-primary/10",
      )}
    >
      {value ? (
        <>
          <img src={value} alt="" className="rounded-lg max-h-80 w-full object-cover" />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(undefined);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 backdrop-blur hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <Upload className="w-7 h-7 text-muted-foreground mb-2" />
          <p className="text-sm font-medium">Solte uma imagem, cole (⌘V) ou clique para enviar</p>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP</p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}