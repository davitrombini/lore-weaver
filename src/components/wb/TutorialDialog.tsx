import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, FileText, Network, Clock, Map as MapIcon, Library, Palette, Command } from "lucide-react";

export function TutorialDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Bem-vindo ao Void
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 text-sm text-foreground/90">
          <p className="text-muted-foreground">
            Void é um gerenciador de worldbuilding e campanhas de RPG. Tudo funciona
            offline no seu navegador — seus projetos ficam salvos localmente.
          </p>

          <Section icon={<FileText className="w-4 h-4 text-primary" />} title="1. Templates & Documentos">
            Cada categoria (Personagens, Locais…) é um <b>template</b> com campos
            personalizados. Cada <b>documento</b> é uma entrada baseada em um
            template. Use o botão <b>+</b> ao lado de uma categoria na barra
            lateral para criar uma nova entrada.
          </Section>

          <Section icon={<Library className="w-4 h-4 text-primary" />} title="2. Biblioteca de Templates">
            Abra a <b>Biblioteca</b> na barra lateral para adicionar templates prontos.
            Existem três coleções: <b>Fantasia & RPG</b>, <b>Ficção Científica</b> e
            <b> Moderno / Urbano</b>. Use <b>“Importar Biblioteca Toda”</b> para
            adicionar todos os templates da coleção atual de uma vez.
          </Section>

          <Section icon={<Palette className="w-4 h-4 text-primary" />} title="3. Personalização de Templates">
            No <b>Gerenciador de Templates</b> você pode renomear, escolher ícone,
            e definir a <b>cor do ícone</b>, <b>cor do texto</b> e <b>cor de fundo</b>.
            Também é possível reordenar, renomear ou remover campos individuais e
            criar subcategorias.
          </Section>

          <Section icon={<Sparkles className="w-4 h-4 text-primary" />} title="4. Texto Rico: Markdown & Cores">
            Os campos de texto rico suportam Markdown básico:
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li><code>**negrito**</code>, <code>*itálico*</code>, <code>`código`</code></li>
              <li><code># Título</code>, <code>## Subtítulo</code></li>
              <li><code>- item</code> para listas, <code>&gt; citação</code></li>
              <li><code>[link](https://…)</code></li>
            </ul>
            <div className="mt-2">
              Códigos de cor no estilo Minecraft: <code>&amp;1</code>…<code>&amp;9</code>,
              <code> &amp;a</code>…<code>&amp;f</code>. Exemplos:{" "}
              <span style={{ color: "#22c55e" }}>&amp;a verde</span>,{" "}
              <span style={{ color: "#ef4444" }}>&amp;c vermelho</span>,{" "}
              <span style={{ color: "#facc15" }}>&amp;e amarelo</span>. Use{" "}
              <code>&amp;r</code> para redefinir e <code>&amp;l</code> para negrito.
            </div>
          </Section>

          <Section icon={<Network className="w-4 h-4 text-primary" />} title="5. Visualizações">
            <div className="flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1"><Network className="w-3.5 h-3.5" /> Grafo de relacionamentos</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Linha do tempo por datas</span>
              <span className="inline-flex items-center gap-1"><MapIcon className="w-3.5 h-3.5" /> Mapas com pinos interativos</span>
            </div>
          </Section>

          <Section icon={<Command className="w-4 h-4 text-primary" />} title="6. Atalhos">
            <ul className="list-disc pl-5 space-y-0.5">
              <li><kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">⌘K</kbd> abre a busca global</li>
              <li>Passe o mouse sobre um documento para ver o botão do <b>Gerenciador de Templates</b></li>
              <li>Use <b>Exportar projeto</b> no menu do projeto para salvar backups em JSON</li>
            </ul>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-4 bg-card/40">
      <div className="font-medium mb-1.5 flex items-center gap-2">{icon} {title}</div>
      <div className="text-sm text-foreground/80 leading-relaxed">{children}</div>
    </div>
  );
}