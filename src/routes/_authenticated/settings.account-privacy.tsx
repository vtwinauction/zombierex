import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SettingsScreen, Card } from "@/components/SettingsScreen";
import { getMyProfile, updateMyProfile } from "@/lib/profile.functions";

type AllowMessages = "everyone" | "followers" | "none";
type PrivacyPrefs = { is_private: boolean; allow_messages: AllowMessages };

export const Route = createFileRoute("/_authenticated/settings/account-privacy")({
  head: () => ({
    meta: [
      { title: "Account privacy · Settings · ZOMBIEREX" },
      {
        name: "description",
        content: "Control who can see your garage and who can message you on ZOMBIEREX.",
      },
      { property: "og:title", content: "Account privacy · Settings · ZOMBIEREX" },
      {
        property: "og:description",
        content: "Control who can see your garage and who can message you on ZOMBIEREX.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPrivacyPage,
});

function AccountPrivacyPage() {
  const qc = useQueryClient();
  const getProfile = useServerFn(getMyProfile);
  const updateProfile = useServerFn(updateMyProfile);

  const profileQ = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => await getProfile(),
  });

  const [prefs, setPrefs] = useState<PrivacyPrefs>({
    is_private: false,
    allow_messages: "followers",
  });

  useEffect(() => {
    const p = profileQ.data as any;
    if (p) {
      setPrefs({
        is_private: !!p.is_private,
        allow_messages: (p.allow_messages as AllowMessages) ?? "followers",
      });
    }
  }, [profileQ.data]);

  const saveM = useMutation({
    mutationFn: async (next: PrivacyPrefs) => updateProfile({ data: next }),
    onSuccess: (row) => {
      qc.setQueryData(["profile", "me"], row);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Privacy saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  const commit = (next: PrivacyPrefs) => {
    setPrefs(next);
    saveM.mutate(next);
  };

  return (
    <SettingsScreen
      index="06.04"
      section="PRIVACY"
      title="Account privacy"
      subtitle="Choose who can see your account and who can contact you."
    >
      {profileQ.isLoading && (
        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
            Loading…
          </p>
        </Card>
      )}

      {!profileQ.isLoading && (
        <div className="space-y-3">
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>
                  Private account
                </p>
                <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
                  Only approved followers can see your posts and garage updates.
                </p>
              </div>
              <Switch
                checked={prefs.is_private}
                disabled={saveM.isPending}
                onChange={(v) => commit({ ...prefs, is_private: v })}
              />
            </div>
          </Card>
          <Card>
            <p className="mono-tag mb-3" style={{ color: "var(--color-silver)" }}>
              Who can message you
            </p>
            <div className="grid gap-2">
              {(
                [
                  ["everyone", "Everyone", "Any rider can start a conversation."],
                  ["followers", "Followers", "Only riders you follow or approve."],
                  ["none", "No one", "Close all new message requests."],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  disabled={saveM.isPending}
                  onClick={() => commit({ ...prefs, allow_messages: value })}
                  className="tap w-full rounded-md px-3 py-3 text-left disabled:opacity-60"
                  style={{
                    background:
                      prefs.allow_messages === value ? "var(--color-neon)" : "var(--color-paper-2)",
                    color: prefs.allow_messages === value ? "#000" : "var(--color-ink)",
                    border: "1px solid var(--color-hair-strong)",
                  }}
                >
                  <span className="block text-[13px] font-semibold">{label}</span>
                  <span className="mt-0.5 block text-[11px] opacity-75">{hint}</span>
                </button>
              ))}
            </div>
          </Card>
          <p className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 10 }}>
            {saveM.isPending ? "SAVING…" : "SYNCED TO BACKEND"}
          </p>
        </div>
      )}
    </SettingsScreen>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className="tap h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60"
      style={{
        background: checked ? "var(--color-neon)" : "var(--color-hair-strong)",
        position: "relative",
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: checked ? 24 : 3,
          height: 21,
          width: 21,
          borderRadius: 999,
          background: "#fff",
          transition: "left .16s ease",
        }}
      />
    </button>
  );
}
