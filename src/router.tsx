import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultPending() {
  return (
    <div className="grid min-h-svh place-items-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: "var(--color-neon, #00c853)", borderTopColor: "transparent" }}
      />
    </div>
  );
}

function DefaultError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-svh place-items-center px-6">
      <div className="card-surface max-w-sm p-6 text-center">
        <p className="mono-tag" style={{ color: "var(--color-heat, #ff4d4d)" }}>ERR · ROUTE</p>
        <h1 className="mt-2 text-xl">Something went wrong</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-ink-3)" }}>
          {error?.message ?? "Unknown error"}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button onClick={reset} className="btn-solid">Retry</button>
          <a href="/" className="btn-ghost">Home</a>
        </div>
      </div>
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: (failureCount, error: unknown) => {
          const status = (error as { status?: number } | null)?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: { retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultPendingComponent: DefaultPending,
    defaultErrorComponent: DefaultError,
    defaultPendingMs: 0,
  });

  return router;
};
