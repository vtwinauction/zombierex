import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { submitReport, blockUser, muteUser } from "@/lib/moderation.functions";
import { haptic } from "@/lib/native";

export type ReportTargetKind =
  | "post"
  | "reel"
  | "story"
  | "comment"
  | "message"
  | "profile"
  | "community"
  | "event"
  | "listing";

type Reason =
  | "spam"
  | "scam"
  | "harassment"
  | "hate"
  | "violence"
  | "nudity"
  | "self_harm"
  | "impersonation"
  | "copyright"
  | "misinformation"
  | "other";

const REASONS: Array<{ key: Reason; label: string; hint: string }> = [
  { key: "spam", label: "Spam or misleading", hint: "Repetitive, deceptive, or bot-like content" },
  { key: "harassment", label: "Harassment or bullying", hint: "Targeted attacks or threats" },
  { key: "hate", label: "Hate speech", hint: "Attacks based on identity" },
  {
    key: "violence",
    label: "Violence or dangerous acts",
    hint: "Wheelies through traffic, public-road racing",
  },
  { key: "nudity", label: "Nudity or sexual content", hint: "Adult content posted publicly" },
  { key: "self_harm", label: "Self-harm or suicide", hint: "Content that promotes harm to self" },
  { key: "scam", label: "Scam or fraud", hint: "Marketplace fraud, phishing" },
  { key: "impersonation", label: "Impersonation", hint: "Pretending to be someone else" },
  { key: "copyright", label: "Copyright / IP", hint: "Stolen media or brand misuse" },
  { key: "misinformation", label: "Misinformation", hint: "False claims presented as fact" },
  { key: "other", label: "Something else", hint: "Add a note below" },
];

export function ReportBlockSheet({
  open,
  onClose,
  targetKind,
  targetId,
  authorId,
  authorHandle,
}: {
  open: boolean;
  onClose: () => void;
  targetKind: ReportTargetKind;
  /** UUID of the target (post/reel/etc). Required to file a report. */
  targetId?: string;
  /** UUID of the author — required for Block/Mute. */
  authorId?: string;
  authorHandle?: string;
}) {
  const [tab, setTab] = useState<"menu" | "report">("menu");
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState<null | "report" | "block" | "mute">(null);

  const send = useServerFn(submitReport);
  const block = useServerFn(blockUser);
  const mute = useServerFn(muteUser);

  useEffect(() => {
    if (!open) {
      setTab("menu");
      setReason(null);
      setDetails("");
      setBusy(null);
    }
  }, [open]);

  if (!open) return null;

  const isUuid = (v?: string) => !!v && /^[0-9a-f-]{36}$/i.test(v);

  async function onSubmit() {
    if (!reason) return;
    if (!isUuid(targetId)) {
      toast.error("This item can't be reported yet");
      return;
    }
    setBusy("report");
    try {
      await send({
        data: {
          target_kind: targetKind,
          target_id: targetId!,
          reason,
          details: details || undefined,
        },
      });
      void haptic("light");
      toast.success("Report received. Thanks for helping keep ZOMBIEREX safe.");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't submit report");
    } finally {
      setBusy(null);
    }
  }

  async function onBlock() {
    if (!isUuid(authorId)) {
      toast.error("No user to block");
      return;
    }
    setBusy("block");
    try {
      await block({ data: { user_id: authorId! } });
      void haptic("medium");
      toast.success(authorHandle ? `Blocked ${authorHandle}` : "User blocked");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't block");
    } finally {
      setBusy(null);
    }
  }

  async function onMute() {
    if (!isUuid(authorId)) {
      toast.error("No user to mute");
      return;
    }
    setBusy("mute");
    try {
      await mute({ data: { user_id: authorId! } });
      void haptic("light");
      toast.success(authorHandle ? `Muted ${authorHandle}` : "User muted");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't mute");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl"
        style={{
          background: "var(--color-obsidian, #0a0a0b)",
          borderTop: "1px solid var(--color-hair-strong, #232323)",
          paddingBottom: "max(env(safe-area-inset-bottom), 16px)",
          maxHeight: "82svh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto mt-2 h-1 w-10 rounded-full"
          style={{ background: "var(--color-hair-strong)" }}
        />

        {tab === "menu" && (
          <div className="p-4">
            <p
              className="mono-tag mb-3"
              style={{ color: "var(--color-silver)", fontSize: 10, letterSpacing: "0.16em" }}
            >
              MODERATE {authorHandle ? `· ${authorHandle}` : ""}
            </p>
            <Action
              label="Report"
              hint="Send to the ZOMBIEREX moderation team"
              tone="warn"
              onClick={() => setTab("report")}
            />
            <Action
              label="Mute"
              hint="Hide their posts from your feed. They aren't notified."
              disabled={!isUuid(authorId) || busy !== null}
              onClick={onMute}
            />
            <Action
              label="Block"
              hint="They can't see your profile, follow you, or DM you."
              tone="danger"
              disabled={!isUuid(authorId) || busy !== null}
              onClick={onBlock}
            />
            <button
              onClick={onClose}
              className="tap mt-3 w-full rounded-lg px-4 py-3 text-[13px]"
              style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}
            >
              Cancel
            </button>
          </div>
        )}

        {tab === "report" && (
          <div className="p-4">
            <button
              onClick={() => setTab("menu")}
              className="mono-tag mb-3"
              style={{ color: "var(--color-titanium)", fontSize: 10, letterSpacing: "0.16em" }}
            >
              ← BACK
            </button>
            <p className="serif text-[18px] italic" style={{ color: "var(--color-ink)" }}>
              Why are you reporting this?
            </p>
            <p className="mt-1 text-[12px]" style={{ color: "var(--color-silver)" }}>
              Reports are confidential. Our team reviews within 24 hours.
            </p>

            <div className="mt-4 space-y-1.5">
              {REASONS.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setReason(r.key)}
                  className="tap w-full rounded-lg px-3 py-2.5 text-left"
                  style={{
                    border: `1px solid ${reason === r.key ? "var(--color-neon, #00c853)" : "var(--color-hair)"}`,
                    background: reason === r.key ? "rgba(0,200,83,0.08)" : "transparent",
                  }}
                >
                  <p className="text-[13px]" style={{ color: "var(--color-ink)" }}>
                    {r.label}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--color-silver)" }}>
                    {r.hint}
                  </p>
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="mono-tag text-xs" style={{ color: "var(--color-silver)" }}>
                DETAILS (OPTIONAL)
              </span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 2000))}
                rows={3}
                className="mt-1 w-full rounded-md bg-transparent px-3 py-2 text-sm"
                style={{ border: "1px solid var(--color-hair-strong)", color: "var(--color-ink)" }}
                placeholder="Anything else our team should know?"
              />
            </label>

            <button
              onClick={onSubmit}
              disabled={!reason || busy !== null}
              className="tap mt-4 w-full rounded-lg px-4 py-3 text-[13px] font-medium"
              style={{
                background: reason ? "var(--color-neon, #00c853)" : "transparent",
                border: `1px solid ${reason ? "var(--color-neon, #00c853)" : "var(--color-hair-strong)"}`,
                color: reason ? "var(--color-obsidian, #0a0a0b)" : "var(--color-titanium)",
                opacity: busy === "report" ? 0.6 : 1,
              }}
            >
              {busy === "report" ? "Submitting…" : "Submit report"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Action({
  label,
  hint,
  onClick,
  tone,
  disabled,
}: {
  label: string;
  hint: string;
  onClick: () => void;
  tone?: "warn" | "danger";
  disabled?: boolean;
}) {
  const color = tone === "danger" ? "#ff5050" : tone === "warn" ? "#ffb84d" : "var(--color-ink)";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="tap mb-2 block w-full rounded-lg px-4 py-3 text-left disabled:opacity-50"
      style={{
        border: "1px solid var(--color-hair-strong)",
        background: "var(--color-graphite, #111214)",
      }}
    >
      <p className="text-[14px] font-medium" style={{ color }}>
        {label}
      </p>
      <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-silver)" }}>
        {hint}
      </p>
    </button>
  );
}
