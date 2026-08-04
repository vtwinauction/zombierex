import { createFileRoute, Outlet, Link, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wait for the Supabase client to finish restoring its persisted session.
 *
 * `getSession()` returns whatever is already in memory — on a cold start
 * (especially on native, where storage reads are async) the session may not
 * have been rehydrated yet. We wait for the first `INITIAL_SESSION` event
 * (or a short timeout) before deciding to redirect.
 */
async function awaitInitialSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;

  return await new Promise<import("@supabase/supabase-js").Session | null>((resolve) => {
    let done = false;
    const finish = (s: import("@supabase/supabase-js").Session | null) => {
      if (done) return;
      done = true;
      sub.data.subscription.unsubscribe();
      clearTimeout(timer);
      resolve(s);
    };
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        finish(session ?? null);
      }
    });
    // Hard ceiling so a broken storage adapter can never wedge the app.
    const timer = setTimeout(() => finish(null), 1500);
  });
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const session = await awaitInitialSession();
    if (!session?.user) {
      // Preserve the intended destination so /auth can bounce the user back
      // after sign-in. Only same-origin paths — never external URLs.
      const dest = location.href && location.href.startsWith("/") ? location.href : undefined;
      throw redirect({
        to: "/auth",
        search: dest && dest !== "/auth" ? { redirect: dest } : undefined,
      });
    }
    return { user: session.user };
  },
  component: () => <Outlet />,
  errorComponent: ({ error, reset }) => (
    <div className="grid min-h-svh place-items-center px-6">
      <div className="card-surface max-w-sm p-6 text-center">
        <p className="mono-tag" style={{ color: "var(--color-heat, #ff4d4d)" }}>
          ERR · AUTH
        </p>
        <h1 className="mt-2 text-xl">Couldn't load this page</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
          {error?.message ?? "Unknown error"}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={reset} className="btn-solid">
            Retry
          </button>
          <Link to="/" className="btn-ghost">
            Home
          </Link>
        </div>
      </div>
    </div>
  ),
});
