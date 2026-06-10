import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value?: string;
  onChange?: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
}

export function RichTextField({ value, onChange, readOnly, placeholder }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== (value ?? "")) {
      el.innerHTML = value ?? "";
    }
  }, [value]);

  if (readOnly) {
    return (
      <div
        className="prose-invert max-w-none text-foreground/90 leading-relaxed [&_p]:my-2 [&_h1]:text-2xl [&_h2]:text-xl [&_h2]:mt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-primary"
        dangerouslySetInnerHTML={{ __html: value || `<p class="text-muted-foreground italic">Empty</p>` }}
      />
    );
  }

  return (
    <div
      ref={ref}
      contentEditable
      data-placeholder={placeholder ?? "Write…"}
      onInput={(e) => onChange?.((e.target as HTMLDivElement).innerHTML)}
      className={cn(
        "min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed",
        "focus:outline-none focus:ring-2 focus:ring-ring",
        "empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
      )}
    />
  );
}