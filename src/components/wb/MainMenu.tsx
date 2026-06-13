import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FolderOpen, Plus, Upload, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon, ICON_CHOICES } from "./icons";
import type { ProjectMeta, WorkspaceState } from "@/lib/worldbuilder/types";
import { useModals } from "./confirm";

interface Props {
  projects: ProjectMeta[];
  onCreate: (name: string, icon: string) => string;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (name: string, icon: string, state: WorkspaceState) => void;
}

export function MainMenu({ projects, onCreate, onOpen, onDelete, onImport }: Props) {
  const [newOpen, setNewOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm } = useModals();

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => b.updatedAt - a.updatedAt),
    [projects],
  );

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const projectName = data.projectName || file.name.replace(/\.json$/i, "") || "Projeto Importado";
      const projectIcon = data.projectIcon || "Sparkles";
      const state = data.state ?? data;
      onImport(projectName, projectIcon, state);
    } catch (e) {
      await confirm({ title: "Falha ao importar", description: "O arquivo selecionado não é um projeto Void válido.", confirmText: "OK", cancelText: "Fechar" });
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground dark flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-2xl"
      >
        <div className="text-center mb-12">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-primary/40 via-chart-3/30 to-transparent border border-border flex items-center justify-center mb-5 shadow-2xl">
            <Sparkles className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-5xl font-semibold tracking-tight mb-2">Void</h1>
          <p className="text-muted-foreground">Seu gerenciador moderno de worldbuilding e campanhas de RPG.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MenuCard icon={<Plus className="w-5 h-5" />} title="Novo Projeto" desc="Comece um mundo do zero." onClick={() => setNewOpen(true)} />
          <MenuCard icon={<FolderOpen className="w-5 h-5" />} title="Retomar Projeto" desc="Abra um projeto existente." onClick={() => setResumeOpen(true)} disabled={!projects.length} />
          <MenuCard icon={<Upload className="w-5 h-5" />} title="Importar Projeto" desc="Carregue um arquivo .json." onClick={() => fileRef.current?.click()} />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = "";
          }}
        />

        {/* New project dialog */}
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Projeto</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Nome</div>
                <Input autoFocus placeholder="Meu Mundo" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Ícone</div>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {ICON_CHOICES.map((n) => (
                      <SelectItem key={n} value={n}>
                        <div className="flex items-center gap-2"><Icon name={n} className="w-3.5 h-3.5" /> {n}</div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
              <Button
                disabled={!name.trim()}
                onClick={() => {
                  const id = onCreate(name.trim(), icon);
                  setNewOpen(false);
                  setName("");
                  onOpen(id);
                }}
              >Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resume project dialog */}
        <Dialog open={resumeOpen} onOpenChange={setResumeOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Retomar Projeto</DialogTitle></DialogHeader>
            <div className="max-h-[60vh] overflow-auto -mx-1 px-1 space-y-1">
              {sortedProjects.map((p) => (
                <div key={p.id} className="group flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-chart-3/20 border border-border flex items-center justify-center">
                    <Icon name={p.icon} className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">Atualizado em {new Date(p.updatedAt).toLocaleString()}</div>
                  </div>
                  <Button size="sm" onClick={() => { setResumeOpen(false); onOpen(p.id); }}>Abrir</Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Excluir "${p.name}"?`,
                        description: "Esta ação não pode ser desfeita.",
                        confirmText: "Excluir",
                        destructive: true,
                      });
                      if (ok) onDelete(p.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {!sortedProjects.length && (
                <div className="text-center text-muted-foreground py-8 text-sm">Nenhum projeto salvo.</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}

function MenuCard({ icon, title, desc, onClick, disabled }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="text-left p-5 rounded-2xl border border-border bg-card hover:bg-accent/40 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 group"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/25 to-chart-3/10 border border-border flex items-center justify-center text-primary mb-3 group-hover:scale-105 transition-transform">
        {icon}
      </div>
      <div className="font-semibold mb-0.5">{title}</div>
      <div className="text-xs text-muted-foreground">{desc}</div>
    </button>
  );
}