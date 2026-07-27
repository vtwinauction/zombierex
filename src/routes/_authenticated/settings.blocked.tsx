import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsScreen, Card } from "@/components/SettingsScreen";
import { listMyBlocks, unblockUser } from "@/lib/moderation.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/settings/blocked")({
  head: () => ({
    meta: [
      { title: "Blocked people · Settings · ZOMBIEREX" },
      { name: "description", content: "Manage the users you have blocked on ZOMBIEREX." },
    ],
  }),
  component: BlockedPage,
});

type BlockRow = { id: string; blocked_id: string; reason: string | null; created_at: string };
type ProfileLite = { id: string; handle: string | null; display_name: string | null; avatar_url: string | null };

function BlockedPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMyBlocks);
  const unblock = useServerFn(unblockUser);

  const blocksQ = useQuery({
    queryKey: ["moderation", "blocks", "mine"],
    queryFn: async () => (await list()) as BlockRow[],
  });

  const ids = useMemo(() => (blocksQ.data ?? []).map((b) => b.blocked_id), [blocksQ.data]);

  const profilesQ = useQuery({
    queryKey: ["moderation", "blocks", "profiles", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", ids);
      if (error) throw new Error(error.message);
      return (data ?? []) as ProfileLite[];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, ProfileLite>();
    for (const p of profilesQ.data ?? []) m.set(p.id, p);
    return m;
  }, [profilesQ.data]);

  const removeM = useMutation({
    mutationFn: async (user_id: string) => unblock({ data: { user_id } }),
    onSuccess: (_r, user_id) => {
      toast.success("Unblocked");
      qc.setQueryData<BlockRow[]>(["moderation", "blocks", "mine"], (prev) =>
        (prev ?? []).filter((b) => b.blocked_id !== user_id),
      );
      qc.invalidateQueries({ queryKey: ["feed"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to unblock"),
  });

  const rows = blocksQ.data ?? [];

  return (
    <SettingsScreen
      index="06.04"
      section="BLOCKED"
      title="Blocked people"
      subtitle="Blocked riders can't see your posts, message you, or interact with your content."
    >
      {blocksQ.isLoading && (
        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>Loading…</p>
        </Card>
      )}

      {blocksQ.isError && (
        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-neon)" }}>
            {(blocksQ.error as any)?.message ?? "Failed to load blocks."}
          </p>
        </Card>
      )}

      {!blocksQ.isLoading && rows.length === 0 && (
        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
            You haven't blocked anyone. Use the report menu on a post or profile to block someone.
          </p>
        </Card>
      )}

      <div className="mt-3 space-y-2">
        {rows.map((b) => {
          const p = profileMap.get(b.blocked_id);
          const handle = p?.handle ? `@${p.handle}` : "@unknown";
          const name = p?.display_name ?? handle;
          const pending = removeM.isPending && removeM.variables === b.blocked_id;
          return (
            <Card key={b.id}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full overflow-hidden shrink-0"
                    style={{ background: "var(--color-hair)", border: "1px solid var(--color-hair-strong)" }}
                  >
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] truncate" style={{ color: "var(--color-ink)" }}>{name}</p>
                    <p className="text-[11px] mono-tag truncate" style={{ color: "var(--color-silver)" }}>
                      {handle}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  disabled={pending}
                  onClick={() => removeM.mutate(b.blocked_id)}
                  className="mono-tag tap px-3 py-1.5 rounded-full disabled:opacity-50"
                  style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}
                >
                  {pending ? "Unblocking…" : "Unblock"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </SettingsScreen>
  );
}
