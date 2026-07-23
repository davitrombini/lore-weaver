import { useRef, useState } from "react";
import { Upload, Trash2, MapPin, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useWorld } from "@/lib/worldbuilder/store";
import { motion } from "framer-motion";
import { useModals } from "./confirm";

export function MapView() {
  const { state, addMap, addPin, updatePin, removePin, setActiveMap, openTab, deleteMap } = useWorld();
  const { confirm } = useModals();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState("");
  const [zoom, setZoom] = useState(1);
  const [hoverPin, setHoverPin] = useState<{ id: string; x: number; y: number; label: string } | null>(null);

  const activeMap = state.maps.find((m) => m.id === state.activeMapId) ?? state.maps[0];

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    const url = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(file);
    });
    const m = addMap(newName.trim() || "Mapa sem título", url);
    setNewName("");
    setActiveMap(m.id);
  };

  const onClickMap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeMap) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    addPin(activeMap.id, { x, y, label: "Novo Pino" });
  };

  return (
    <div className="h-full flex">
      <aside className="w-60 border-r border-border bg-sidebar p-3 overflow-auto">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Mapas</div>
        <div className="space-y-1 mb-4">
          {state.maps.map((m) => (
            <div key={m.id} className={`group flex items-center gap-1 rounded-md ${activeMap?.id === m.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"}`}>
              <button
                onClick={() => setActiveMap(m.id)}
                className="flex-1 text-left px-2 py-1.5 text-sm truncate"
              >{m.name}</button>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: `Excluir o mapa "${m.name}"?`,
                    description: "Todos os pinos deste mapa serão perdidos.",
                    confirmText: "Excluir",
                    destructive: true,
                  });
                  if (ok) deleteMap(m.id);
                }}
                className="opacity-0 group-hover:opacity-100 px-1.5 py-1 text-muted-foreground hover:text-destructive"
                title="Excluir mapa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {state.maps.length === 0 && (
            <div className="text-xs italic text-muted-foreground">Nenhum mapa ainda</div>
          )}
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          <Input placeholder="Nome do mapa" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
          <Button size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Enviar Mapa
          </Button>
        </div>
      </aside>

      <div className="flex-1 overflow-auto p-6">
        {!activeMap ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-sm">
              <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">Nenhum mapa carregado</h3>
              <p className="text-sm text-muted-foreground">
                Envie a imagem de um mapa para começar a posicionar pinos vinculados a documentos de localização.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold">{activeMap.name}</h2>
                <p className="text-sm text-muted-foreground">Clique para adicionar um pino. Passe o mouse para ver o nome.</p>
              </div>
              <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.25).toFixed(2)))} title="Reduzir">
                  <ZoomOut className="w-3.5 h-3.5" />
                </Button>
                <div className="text-xs w-10 text-center tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</div>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(4, +(z + 0.25).toFixed(2)))} title="Ampliar">
                  <ZoomIn className="w-3.5 h-3.5" />
                </Button>
                <div className="w-px h-5 bg-border mx-1" />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoom(1)} title="Restaurar">
                  <Maximize2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <div className="overflow-auto border border-border rounded-lg bg-card max-h-[calc(100vh-180px)] relative">
            <div
              ref={imgRef}
              onClick={onClickMap}
              className="relative inline-block cursor-crosshair origin-top-left transition-transform"
              style={{ transform: `scale(${zoom})` }}
            >
              <img src={activeMap.image} alt={activeMap.name} className="block max-w-none" draggable={false} />
              {activeMap.pins.map((p) => {
                const linked = state.documents.find((d) => d.id === p.documentId);
                const label = p.label || linked?.title || "Pino";
                return (
                  <Popover key={p.id}>
                    <PopoverTrigger asChild>
                      <motion.button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
                        onMouseEnter={() => setHoverPin({ id: p.id, x: p.x, y: p.y, label })}
                        onMouseLeave={() => setHoverPin((h) => (h?.id === p.id ? null : h))}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        whileHover={{ scale: 1.15 }}
                        className="absolute -translate-x-1/2 -translate-y-full"
                        style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                      >
                        <MapPin className="w-6 h-6 text-primary drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] fill-primary/40" />
                      </motion.button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" onClick={(e) => e.stopPropagation()}>
                      <Input
                        value={p.label ?? ""}
                        onChange={(e) => updatePin(activeMap.id, p.id, { label: e.target.value })}
                        placeholder="Rótulo do pino"
                        className="mb-2"
                      />
                      <div className="text-xs text-muted-foreground mb-1">Documento vinculado</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            {linked ? linked.title : "Vincular documento…"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0">
                          <Command>
                            <CommandInput placeholder="Buscar…" />
                            <CommandList>
                              <CommandEmpty>Nenhum.</CommandEmpty>
                              <CommandGroup>
                                {state.documents.map((d) => (
                                  <CommandItem
                                    key={d.id}
                                    value={d.title}
                                    onSelect={() => updatePin(activeMap.id, p.id, { documentId: d.id })}
                                  >
                                    {d.title}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <div className="flex justify-between mt-2">
                        {linked && (
                          <Button size="sm" variant="ghost" onClick={() => openTab(linked.id)}>
                            Abrir
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-auto text-destructive"
                          onClick={() => removePin(activeMap.id, p.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                );
              })}
              {hoverPin && (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+24px)] px-2 py-1 rounded-md bg-popover text-popover-foreground text-xs border border-border shadow-lg whitespace-nowrap"
                  style={{ left: `${hoverPin.x * 100}%`, top: `${hoverPin.y * 100}%`, transform: `translate(-50%, -200%) scale(${1 / zoom})`, transformOrigin: "bottom center" }}
                >
                  {hoverPin.label}
                </div>
              )}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}