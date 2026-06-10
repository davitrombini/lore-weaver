import { useRef, useState } from "react";
import { Upload, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useWorld } from "@/lib/worldbuilder/store";
import { motion } from "framer-motion";

export function MapView() {
  const { state, addMap, addPin, updatePin, removePin, setActiveMap, openTab } = useWorld();
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const [newName, setNewName] = useState("");

  const activeMap = state.maps.find((m) => m.id === state.activeMapId) ?? state.maps[0];

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    const url = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.readAsDataURL(file);
    });
    const m = addMap(newName.trim() || "Untitled Map", url);
    setNewName("");
    setActiveMap(m.id);
  };

  const onClickMap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeMap) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    addPin(activeMap.id, { x, y, label: "New Pin" });
  };

  return (
    <div className="h-full flex">
      <aside className="w-60 border-r border-border bg-sidebar p-3 overflow-auto">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Maps</div>
        <div className="space-y-1 mb-4">
          {state.maps.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveMap(m.id)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-sm ${
                activeMap?.id === m.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              }`}
            >
              {m.name}
            </button>
          ))}
          {state.maps.length === 0 && (
            <div className="text-xs italic text-muted-foreground">No maps yet</div>
          )}
        </div>
        <div className="space-y-2 border-t border-border pt-3">
          <Input placeholder="Map name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onUpload(e.target.files?.[0])}
          />
          <Button size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
            <Upload className="w-3.5 h-3.5 mr-1" /> Upload Map
          </Button>
        </div>
      </aside>

      <div className="flex-1 overflow-auto p-6">
        {!activeMap ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-sm">
              <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-lg mb-1">No map loaded</h3>
              <p className="text-sm text-muted-foreground">
                Upload a map image to start placing pins linked to location documents.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-semibold mb-1">{activeMap.name}</h2>
            <p className="text-sm text-muted-foreground mb-4">Click anywhere on the map to drop a pin.</p>
            <div
              ref={imgRef}
              onClick={onClickMap}
              className="relative inline-block border border-border rounded-lg overflow-hidden bg-card cursor-crosshair max-w-full"
            >
              <img src={activeMap.image} alt={activeMap.name} className="block max-w-full max-h-[calc(100vh-200px)]" />
              {activeMap.pins.map((p) => {
                const linked = state.documents.find((d) => d.id === p.documentId);
                return (
                  <Popover key={p.id}>
                    <PopoverTrigger asChild>
                      <motion.button
                        type="button"
                        onClick={(e) => e.stopPropagation()}
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
                        placeholder="Pin label"
                        className="mb-2"
                      />
                      <div className="text-xs text-muted-foreground mb-1">Linked document</div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-start">
                            {linked ? linked.title : "Link document…"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0">
                          <Command>
                            <CommandInput placeholder="Search…" />
                            <CommandList>
                              <CommandEmpty>None.</CommandEmpty>
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
                            Open
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}