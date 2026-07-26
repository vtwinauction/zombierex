import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { listConversations } from "@/lib/messages.functions";
import { supabase } from "@/integrations/supabase/client";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [
    { title: "Comms · ZOMBIEREX" },
    { name: "description", content: "Private transmissions between riders on the ZOMBIEREX network." },
    { property: "og:title", content: "Comms · ZOMBIEREX" },
    { property: "og:description", content: "Private transmissions between riders." },
  ] }),
  component: MessagesPage,
});

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function MessagesPage() {
  const fn = useServerFn(listConversations);
  const q = useQuery({
    queryKey: ["conversations"],
    queryFn: () => fn({ data: undefined as any }),
    staleTime: 10_000,
  });

  // realtime — refetch on any new message
  useEffect(() => {
    const ch = supabase.channel("messages-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => q.refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [q]);

  const rows = q.data ?? [];
  const totalUnread = rows.reduce((s: number, c: any) => s + (c.unread || 0), 0);

  return (
    <PullToRefresh onRefresh={() => q.refetch()}>
    <div>
      <div className="px-4 pt-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="mono-tag">CHANNEL · {rows.length} ACTIVE</p>
            <h1 className="mt-2 display-xl text-5xl uppercase">Comms</h1>
          </div>
          <div className="text-right">
            <p className="mono-tag" style={{ color: "var(--color-ash)" }}>UNREAD</p>
            <p className="display-numeral text-3xl" style={{ color: "var(--color-signal)" }}>
              {String(totalUnread).padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {q.isLoading && <p className="mono-tag px-4 pt-6" style={{ color: "var(--color-ash)" }}>LOADING…</p>}
      {!q.isLoading && rows.length === 0 && (
        <div className="px-4 pt-10 text-center">
          <p className="mono-tag" style={{ color: "var(--color-ash)" }}>NO TRANSMISSIONS</p>
          <p className="mt-2 text-sm" style={{ color: "var(--color-ash)" }}>Open a rider profile and hit "Message" to start a channel.</p>
        </div>
      )}

      <ul className="mt-6 divide-y divide-hair hairline-t hairline-b">
        {rows.map((c: any, i: number) => {
          const other = c.others?.[0];
          const name = c.title ?? other?.display_name ?? other?.username ?? "Rider";
          const avatar = other?.avatar_url ?? "/favicon.ico";
          return (
            <li key={c.id}>
              <Link to="/messages/$id" params={{ id: c.id }} className="grid grid-cols-[40px_44px_1fr_auto] items-center gap-3 px-4 py-4">
                <div>
                  <p className="mono-tag" style={{ color: "var(--color-ash)" }}>CH·{String(i + 1).padStart(2, "0")}</p>
                </div>
                <img src={avatar} alt="" className="h-11 w-11 object-cover hairline" />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold">{name}</p>
                  <p className="mt-0.5 truncate text-[12px]" style={{ color: c.unread ? "var(--color-ink)" : "var(--color-ash)" }}>
                    {c.lastMessage?.mine ? "You: " : ""}{c.lastMessage?.body ?? "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="mono-tag" style={{ color: "var(--color-ash)" }}>{timeAgo(c.lastMessageAt)}</p>
                  {c.unread > 0 && (
                    <span className="mt-1 inline-grid h-5 min-w-5 place-items-center px-1.5 mono-num text-[10px] font-bold"
                      style={{ background: "var(--color-signal)", color: "var(--color-bone)" }}>
                      {c.unread}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
    </PullToRefresh>
  );
}
