import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ConfirmOpts = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type PromptOpts = {
  title: string;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmText?: string;
};

type Ctx = {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  prompt: (o: PromptOpts) => Promise<string | null>;
};

const ModalsCtx = createContext<Ctx | null>(null);

export function ModalsProvider({ children }: { children: ReactNode }) {
  const [confirmState, setConfirmState] = useState<(ConfirmOpts & { open: boolean }) | null>(null);
  const [promptState, setPromptState] = useState<(PromptOpts & { open: boolean; value: string }) | null>(null);
  const confirmResolver = useRef<((v: boolean) => void) | null>(null);
  const promptResolver = useRef<((v: string | null) => void) | null>(null);

  const confirm = useCallback((o: ConfirmOpts) => {
    setConfirmState({ ...o, open: true });
    return new Promise<boolean>((res) => { confirmResolver.current = res; });
  }, []);

  const prompt = useCallback((o: PromptOpts) => {
    setPromptState({ ...o, open: true, value: o.defaultValue ?? "" });
    return new Promise<string | null>((res) => { promptResolver.current = res; });
  }, []);

  const resolveConfirm = (v: boolean) => {
    confirmResolver.current?.(v);
    confirmResolver.current = null;
    setConfirmState((s) => s ? { ...s, open: false } : s);
  };
  const resolvePrompt = (v: string | null) => {
    promptResolver.current?.(v);
    promptResolver.current = null;
    setPromptState((s) => s ? { ...s, open: false } : s);
  };

  return (
    <ModalsCtx.Provider value={{ confirm, prompt }}>
      {children}
      <AlertDialog open={!!confirmState?.open} onOpenChange={(o) => !o && resolveConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
            {confirmState?.description && (
              <AlertDialogDescription>{confirmState.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => resolveConfirm(false)}>
              {confirmState?.cancelText ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resolveConfirm(true)}
              className={confirmState?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {confirmState?.confirmText ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!promptState?.open} onOpenChange={(o) => !o && resolvePrompt(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promptState?.title}</DialogTitle>
          </DialogHeader>
          {promptState?.description && (
            <p className="text-sm text-muted-foreground">{promptState.description}</p>
          )}
          <Input
            autoFocus
            placeholder={promptState?.placeholder}
            value={promptState?.value ?? ""}
            onChange={(e) => setPromptState((s) => s ? { ...s, value: e.target.value } : s)}
            onKeyDown={(e) => {
              if (e.key === "Enter") resolvePrompt(promptState?.value ?? "");
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => resolvePrompt(null)}>Cancelar</Button>
            <Button onClick={() => resolvePrompt(promptState?.value ?? "")}>
              {promptState?.confirmText ?? "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModalsCtx.Provider>
  );
}

export function useModals() {
  const ctx = useContext(ModalsCtx);
  if (!ctx) throw new Error("useModals must be used within ModalsProvider");
  return ctx;
}