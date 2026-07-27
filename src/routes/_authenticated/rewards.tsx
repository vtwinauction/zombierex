import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getMyGamificationSummary,
  listAchievements,
  listMyChallenges,
  getLeaderboard,
  dailyCheckIn,
  claimChallenge,
} from "@/lib/gamification.functions";
import { Flame, Trophy, Zap, Award, Users, Gift, CheckCircle2, Lock } from "lucide-react";
import { PullToRefresh } from "@/components/PullToRefresh";

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards · ZOMBIEREX" },
      { name: "description", content: "Your XP, streaks, achievements, challenges, and leaderboard standing." },
      { property: "og:title", content: "Rewards · ZOMBIEREX" },
      { property: "og:description", content: "Track your XP, streaks, achievements, and leaderboard rank." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const qc = useQueryClient();
  const summaryFn = useServerFn(getMyGamificationSummary);
  const achFn = useServerFn(listAchievements);
  const chFn = useServerFn(listMyChallenges);
  const lbFn = useServerFn(getLeaderboard);
  const checkinFn = useServerFn(dailyCheckIn);
  const claimFn = useServerFn(claimChallenge);

  const summary = useQuery({ queryKey: ["rex-summary"], queryFn: () => summaryFn() });
  const achievements = useQuery({ queryKey: ["rex-ach"], queryFn: () => achFn() });
  const challenges = useQuery({ queryKey: ["rex-ch"], queryFn: () => chFn() });
  const leaderboard = useQuery({
    queryKey: ["rex-lb"],
    queryFn: () => lbFn({ data: { board: "xp", limit: 10 } }),
  });

  const checkin = useMutation({
    mutationFn: () => checkinFn(),
    onSuccess: (r: any) => {
      if (r.alreadyCheckedIn) toast("Already checked in today", { description: `Streak: ${r.streak} days` });
      else toast.success(`+${r.xp} XP`, { description: `${r.streak}-day streak 🔥` });
      qc.invalidateQueries({ queryKey: ["rex-summary"] });
      qc.invalidateQueries({ queryKey: ["rex-ch"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Check-in failed"),
  });

  const claim = useMutation({
    mutationFn: (challenge_id: string) => claimFn({ data: { challenge_id } }),
    onSuccess: (r: any) => {
      if (r.alreadyClaimed) toast("Already claimed");
      else toast.success(`+${r.xp} XP claimed`);
      qc.invalidateQueries({ queryKey: ["rex-ch"] });
      qc.invalidateQueries({ queryKey: ["rex-summary"] });
      qc.invalidateQueries({ queryKey: ["rex-ach"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Not eligible yet"),
  });

  const s = summary.data;
  const progressPct = Math.round(((s?.level_progress ?? 0) as number) * 100);

  return (
    <PullToRefresh onRefresh={async () => { await Promise.all([summary.refetch(), achievements.refetch(), challenges.refetch(), leaderboard.refetch()]); }}>
    <div className="min-h-screen bg-background text-foreground pb-24">

      <div className="px-4 pt-4">
        <div className="text-[10px] tracking-[0.3em] text-muted-foreground">18 · REWARDS</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Your Garage Ledger</h1>
        <p className="mt-1 text-sm text-muted-foreground">XP, streaks, achievements & leaderboard.</p>
      </div>

      {/* Hero card */}
      <div className="mx-4 mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] tracking-[0.25em] text-muted-foreground">LEVEL</div>
            <div className="text-5xl font-bold leading-none text-[hsl(var(--rex-signal,140_90%_50%))]">
              {s?.level ?? "—"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-[0.25em] text-muted-foreground">TOTAL XP</div>
            <div className="text-2xl font-semibold">{s?.xp_total?.toLocaleString() ?? 0}</div>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[hsl(var(--rex-signal,140_90%_50%))] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>{progressPct}% to L{(s?.level ?? 1) + 1}</span>
          <span>{s?.xp_to_next?.toLocaleString() ?? 0} XP to go</span>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-3">
        <StatTile icon={<Flame className="h-5 w-5" />} label="STREAK" value={`${s?.streak_days ?? 0}d`} />
        <StatTile icon={<Award className="h-5 w-5" />} label="BADGES" value={`${s?.achievements_unlocked ?? 0}`} />
        <StatTile icon={<Users className="h-5 w-5" />} label="INVITES" value={`${s?.referrals ?? 0}`} />
      </div>

      {/* Daily check-in */}
      <button
        onClick={() => checkin.mutate()}
        disabled={checkin.isPending}
        className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-between rounded-2xl border border-[hsl(var(--rex-signal,140_90%_50%)/0.4)] bg-[hsl(var(--rex-signal,140_90%_50%)/0.08)] p-4 transition active:scale-[0.99]"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[hsl(var(--rex-signal,140_90%_50%)/0.15)] p-2 text-[hsl(var(--rex-signal,140_90%_50%))]">
            <Zap className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold">Daily Check-In</div>
            <div className="text-[11px] text-muted-foreground">+10 XP · +1 per streak day</div>
          </div>
        </div>
        <span className="text-[11px] tracking-[0.2em] text-[hsl(var(--rex-signal,140_90%_50%))]">CLAIM →</span>
      </button>

      {/* Challenges */}
      <Section title="ACTIVE CHALLENGES" icon={<Gift className="h-4 w-4" />}>
        {challenges.isLoading ? (
          <SkeletonRow />
        ) : (challenges.data ?? []).length === 0 ? (
          <Empty text="No active challenges right now." />
        ) : (
          <div className="space-y-2">
            {(challenges.data ?? []).map((c: any) => {
              const pct = Math.min(100, Math.round(((c.progress ?? 0) / Math.max(1, c.goal_count)) * 100));
              const done = c.progress >= c.goal_count;
              const claimed = !!c.completed_at;
              return (
                <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2">{c.description}</div>
                    </div>
                    <div className="text-right text-[11px] shrink-0">
                      <div className="tracking-[0.2em] text-[hsl(var(--rex-signal,140_90%_50%))]">+{c.xp_reward} XP</div>
                      <div className="text-muted-foreground uppercase">{c.cadence}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[hsl(var(--rex-signal,140_90%_50%))]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {c.progress ?? 0} / {c.goal_count}
                    </span>
                    <button
                      disabled={!done || claimed || claim.isPending}
                      onClick={() => claim.mutate(c.id)}
                      className="rounded-md border border-border px-3 py-1 text-[11px] font-medium disabled:opacity-40"
                    >
                      {claimed ? "CLAIMED" : done ? "CLAIM" : "IN PROGRESS"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Achievements */}
      <Section title="ACHIEVEMENTS" icon={<Award className="h-4 w-4" />}>
        {achievements.isLoading ? (
          <SkeletonRow />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(achievements.data ?? []).map((a: any) => {
              const unlocked = !!a.unlocked_at;
              return (
                <div
                  key={a.slug}
                  className={`rounded-xl border p-3 text-center ${
                    unlocked
                      ? "border-[hsl(var(--rex-signal,140_90%_50%)/0.5)] bg-[hsl(var(--rex-signal,140_90%_50%)/0.06)]"
                      : "border-border bg-card opacity-60"
                  }`}
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-border">
                    {unlocked ? (
                      <CheckCircle2 className="h-5 w-5 text-[hsl(var(--rex-signal,140_90%_50%))]" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold truncate">{a.title ?? a.slug}</div>
                  <div className="text-[10px] text-muted-foreground line-clamp-2">{a.description}</div>
                </div>
              );
            })}
            {(achievements.data ?? []).length === 0 && <Empty text="No achievements defined." />}
          </div>
        )}
      </Section>

      {/* Leaderboard */}
      <Section title="TOP RIDERS · XP" icon={<Trophy className="h-4 w-4" />}>
        {leaderboard.isLoading ? (
          <SkeletonRow />
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {(leaderboard.data?.rows ?? []).map((r: any, i: number) => (
              <div key={r.id ?? `lb-${i}`} className="flex items-center gap-3 p-3">
                <div
                  className={`w-6 text-center text-sm font-bold ${
                    i === 0 ? "text-[hsl(var(--rex-signal,140_90%_50%))]" : "text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{r.display_name ?? r.handle}</div>
                  <div className="text-[11px] text-muted-foreground">@{r.handle} · L{r.level ?? 1}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">{(r.xp_total ?? 0).toLocaleString()}</div>
                  <div className="text-[10px] tracking-[0.2em] text-muted-foreground">XP</div>
                </div>
              </div>
            ))}
            {(leaderboard.data?.rows ?? []).length === 0 && <Empty text="No riders yet." />}
          </div>
        )}
      </Section>
    </div>
    </PullToRefresh>
  );
}


function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center justify-between text-muted-foreground">
        {icon}
        <span className="text-[10px] tracking-[0.2em]">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mx-4 mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[11px] tracking-[0.25em]">{title}</span>
      </div>
      <div className="mx-4">{children}</div>
    </div>
  );
}

function SkeletonRow() {
  return <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</div>;
}
