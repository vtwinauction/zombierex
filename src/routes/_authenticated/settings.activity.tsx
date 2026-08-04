import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SettingsScreen, Card } from "@/components/SettingsScreen";

export const Route = createFileRoute("/_authenticated/settings/activity")({
  head: () => ({
    meta: [
      { title: "Sign-in activity · Settings · ZOMBIEREX" },
      { name: "description", content: "Review recent sign-ins to your ZOMBIEREX account." },
    ],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  const [events, setEvents] = useState<Array<{ label: string; when: string; detail?: string }>>([]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const list: Array<{ label: string; when: string; detail?: string }> = [];
      if (u?.last_sign_in_at)
        list.push({
          label: "Last sign-in",
          when: new Date(u.last_sign_in_at).toLocaleString(),
          detail: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
      if (u?.confirmed_at)
        list.push({ label: "Email confirmed", when: new Date(u.confirmed_at).toLocaleString() });
      if (u?.created_at)
        list.push({ label: "Account created", when: new Date(u.created_at).toLocaleString() });
      setEvents(list);
    });
  }, []);

  return (
    <SettingsScreen
      index="06.08"
      section="ACTIVITY"
      title="Recent sign-in activity"
      subtitle="Tell us if you don't recognise a login by turning on two-step verification."
    >
      <div className="space-y-2">
        {events.map((e, i) => (
          <Card key={i}>
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[14px]" style={{ color: "var(--color-ink)" }}>
                  {e.label}
                </p>
                {e.detail && (
                  <p
                    className="mt-1 break-all text-[11px]"
                    style={{ color: "var(--color-silver)" }}
                  >
                    {e.detail}
                  </p>
                )}
              </div>
              <p className="mono-tag shrink-0" style={{ color: "var(--color-silver)" }}>
                {e.when}
              </p>
            </div>
          </Card>
        ))}
        {events.length === 0 && (
          <Card>
            <p className="text-[13px]" style={{ color: "var(--color-silver)" }}>
              No activity available.
            </p>
          </Card>
        )}
      </div>
    </SettingsScreen>
  );
}
