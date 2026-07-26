import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getPayment, confirmMockPayment } from "@/lib/payments.functions";

const paymentQuery = (id: string) =>
  queryOptions({ queryKey: ["payment", id], queryFn: () => getPayment({ data: { id } }) });

export const Route = createFileRoute("/_authenticated/checkout/$paymentId")({
  head: () => ({ meta: [{ title: "Checkout · ZOMBIEREX" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(paymentQuery(params.paymentId)),
  component: CheckoutPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6 text-foreground">
      <p className="text-sm text-red-500">Payment unavailable: {error.message}</p>
      <button onClick={reset} className="mt-3 border border-border px-3 py-1 text-xs">Retry</button>
    </div>
  ),
  notFoundComponent: () => <div className="p-6 text-foreground">Payment not found.</div>,
});

function CheckoutPage() {
  const { paymentId } = Route.useParams();
  const { data: payment } = useSuspenseQuery(paymentQuery(paymentId));
  const [busy, setBusy] = useState<null | "pay" | "fail">(null);
  const [err, setErr] = useState<string | null>(null);
  const qc = useQueryClient();
  const nav = useNavigate();
  const confirmFn = useServerFn(confirmMockPayment);

  async function simulate(outcome: "succeeded" | "failed") {
    setBusy(outcome === "succeeded" ? "pay" : "fail");
    setErr(null);
    try {
      await confirmFn({ data: { payment_id: payment.id, outcome } });
      await qc.invalidateQueries({ queryKey: ["payment", payment.id] });
      await qc.invalidateQueries({ queryKey: ["my-subscription"] });
      if (outcome === "succeeded") nav({ to: "/vendor" });
    } catch (e: any) {
      setErr(e?.message ?? "Simulation failed");
    } finally {
      setBusy(null);
    }
  }

  const done = payment.status === "succeeded";
  const failed = payment.status === "failed";

  return (
    <div className="px-5 pt-8 pb-24">
      <p className="mono-tag" style={{ color: "var(--color-silver)" }}>CHECKOUT · MOCK</p>
      <h1 className="serif mt-2 text-4xl leading-tight" style={{ color: "var(--color-ink)" }}>
        Confirm <span className="italic" style={{ color: "var(--color-neon)" }}>payment</span>
      </h1>
      <p className="mt-2 text-[12px]" style={{ color: "var(--color-silver)" }}>
        Provider: <span className="mono-tag">{payment.provider}</span> · Status:{" "}
        <span className="mono-tag" style={{ color: done ? "var(--color-neon)" : failed ? "#ff7c5b" : "var(--color-silver)" }}>
          {payment.status.toUpperCase()}
        </span>
      </p>

      <div className="surface-1 lift-1 mt-6 p-5" style={{ borderRadius: 10 }}>
        <p className="mono-tag" style={{ color: "var(--color-silver)" }}>AMOUNT</p>
        <p className="serif mt-1 text-5xl italic" style={{ color: "var(--color-ink)" }}>
          ${(payment.amount_cents / 100).toFixed(2)}
        </p>
        <p className="mt-1 text-[11px]" style={{ color: "var(--color-silver)" }}>{payment.currency}</p>
      </div>

      {err && (
        <div className="mt-4 rounded px-3 py-2 text-[12px]" style={{ background: "rgba(220,60,60,0.1)", border: "1px solid rgba(220,60,60,0.4)" }}>
          {err}
        </div>
      )}

      {!done && !failed && (
        <div className="mt-6 space-y-2">
          <button
            onClick={() => simulate("succeeded")}
            disabled={!!busy}
            className="btn-solid w-full"
            style={{ opacity: busy ? 0.6 : 1 }}
          >
            {busy === "pay" ? "Processing…" : "Simulate successful payment"}
          </button>
          <button
            onClick={() => simulate("failed")}
            disabled={!!busy}
            className="btn-ghost w-full"
          >
            {busy === "fail" ? "…" : "Simulate failure"}
          </button>
          <p className="mt-2 text-[11px]" style={{ color: "var(--color-silver)" }}>
            A real Stripe or Paddle checkout will replace this page. The webhook and payment record are already wired.
          </p>
        </div>
      )}

      {done && (
        <div className="mt-6">
          <p className="mono-tag" style={{ color: "var(--color-neon)" }}>◆ PAYMENT CONFIRMED</p>
          <button onClick={() => nav({ to: "/vendor" })} className="btn-solid mt-3 w-full">Back to console</button>
        </div>
      )}
    </div>
  );
}
