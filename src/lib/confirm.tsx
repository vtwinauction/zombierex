/**
 * Imperative promise-based confirm dialog powered by Radix AlertDialog.
 * Replaces native `window.confirm()` so we get themed, accessible modals.
 *
 * Usage:
 *   import { confirmDialog } from "@/lib/confirm";
 *   if (!(await confirmDialog({ title: "Delete listing?" }))) return;
 *
 * Mount <ConfirmHost /> once in the app root.
 */
import { useEffect, useState } from "react";
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

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

const EVT = "zx:confirm";

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(
      new CustomEvent<PendingConfirm>(EVT, { detail: { ...opts, resolve } }),
    );
  });
}

export function ConfirmHost() {
  const [state, setState] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<PendingConfirm>).detail;
      setState(detail);
    };
    window.addEventListener(EVT, onEvt as EventListener);
    return () => window.removeEventListener(EVT, onEvt as EventListener);
  }, []);

  const close = (ok: boolean) => {
    if (state) state.resolve(ok);
    setState(null);
  };

  return (
    <AlertDialog open={!!state} onOpenChange={(open) => { if (!open) close(false); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title ?? "Are you sure?"}</AlertDialogTitle>
          {state?.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {state?.cancelLabel ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            style={state?.destructive ? { background: "var(--color-heat, #ef4444)", color: "#fff" } : undefined}
          >
            {state?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
