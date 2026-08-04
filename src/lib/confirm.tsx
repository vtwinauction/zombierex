/**
 * Imperative promise-based confirm + prompt dialogs powered by Radix.
 * Replaces native `window.confirm()` / `window.prompt()`.
 *
 * Usage:
 *   import { confirmDialog, promptDialog } from "@/lib/confirm";
 *   if (!(await confirmDialog({ title: "Delete listing?" }))) return;
 *   const reason = await promptDialog({ title: "Suspension reason?" });
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

type PromptOptions = ConfirmOptions & {
  placeholder?: string;
  defaultValue?: string;
  multiline?: boolean;
  required?: boolean;
};

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void; kind: "confirm" };
type PendingPrompt = PromptOptions & { resolve: (value: string | null) => void; kind: "prompt" };
type Pending = PendingConfirm | PendingPrompt;

const EVT = "zx:confirm";

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    window.dispatchEvent(
      new CustomEvent<Pending>(EVT, { detail: { ...opts, resolve, kind: "confirm" } }),
    );
  });
}

export function promptDialog(opts: PromptOptions): Promise<string | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise<string | null>((resolve) => {
    window.dispatchEvent(
      new CustomEvent<Pending>(EVT, { detail: { ...opts, resolve, kind: "prompt" } }),
    );
  });
}

export function ConfirmHost() {
  const [state, setState] = useState<Pending | null>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    const onEvt = (e: Event) => {
      const detail = (e as CustomEvent<Pending>).detail;
      setValue(detail.kind === "prompt" ? (detail.defaultValue ?? "") : "");
      setState(detail);
    };
    window.addEventListener(EVT, onEvt as EventListener);
    return () => window.removeEventListener(EVT, onEvt as EventListener);
  }, []);

  const finish = (ok: boolean) => {
    if (!state) return;
    if (state.kind === "prompt") {
      state.resolve(ok ? value : null);
    } else {
      state.resolve(ok);
    }
    setState(null);
    setValue("");
  };

  const isPrompt = state?.kind === "prompt";
  const promptState = isPrompt ? (state as PendingPrompt) : null;
  const canConfirm = !promptState?.required || value.trim().length > 0;

  return (
    <AlertDialog
      open={!!state}
      onOpenChange={(open) => {
        if (!open) finish(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title ?? "Are you sure?"}</AlertDialogTitle>
          {state?.description && (
            <AlertDialogDescription>{state.description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        {promptState &&
          (promptState.multiline ? (
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={promptState.placeholder}
              rows={3}
              className="mt-1 w-full rounded-md border bg-transparent p-2 text-sm"
              style={{ borderColor: "var(--color-hair-strong)" }}
            />
          ) : (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={promptState.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) finish(true);
              }}
              className="mt-1 w-full rounded-md border bg-transparent p-2 text-sm"
              style={{ borderColor: "var(--color-hair-strong)" }}
            />
          ))}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => finish(false)}>
            {state?.cancelLabel ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => finish(true)}
            disabled={!canConfirm}
            style={
              state?.destructive
                ? { background: "var(--color-heat, #ef4444)", color: "#fff" }
                : undefined
            }
          >
            {state?.confirmLabel ?? "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
