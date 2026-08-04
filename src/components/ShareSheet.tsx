"use client";

import { useEffect, useState } from "react";
import { Share2, Link2, Check, X, Download } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { share } from "@/lib/native";
import { shareUrl, shareTitle, type ShareableType } from "@/lib/share";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ShareSheetProps {
  type: ShareableType;
  id: string;
  title?: string | null;
  subtitle?: string | null;
  children: React.ReactNode;
  className?: string;
}

export function ShareSheet({ type, id, title, subtitle, children, className }: ShareSheetProps) {
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = shareUrl(type, id);
  const displayTitle = title || shareTitle(type, title);

  useEffect(() => {
    if (!open) {
      setQr(null);
      setCopied(false);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      color: { dark: "#0a0a0a", light: "#ffffff" },
      type: "image/png",
    })
      .then((dataUrl) => {
        if (!cancelled) setQr(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQr(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  const nativeShare = async () => {
    const ok = await share({ title: displayTitle, text: subtitle || displayTitle, url });
    if (!ok) await copyLink();
  };

  const downloadQr = async () => {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr;
    a.download = `zrx-${type}-${id.slice(0, 8)}.png`;
    a.click();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className={className} aria-label="Share">
          {children}
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t border-[var(--color-line)] bg-[var(--color-paper-0)] px-4 pb-8 pt-5"
      >
        <SheetHeader className="text-left">
          <SheetTitle className="display-roman text-lg">Share</SheetTitle>
          <p className="mono-tag mt-1" style={{ color: "var(--color-ink-3)" }}>
            {subtitle || displayTitle}
          </p>
        </SheetHeader>

        <div className="mt-6 flex flex-col items-center">
          <div className="relative p-3 hairline rounded-2xl bg-white">
            {qr ? (
              <img src={qr} alt="QR code" className="h-48 w-48" />
            ) : (
              <div className="h-48 w-48 animate-pulse bg-[var(--color-paper-2)] rounded-xl" />
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ background: "var(--color-neon)" }}
              >
                <span className="text-xs font-bold" style={{ color: "var(--color-ink-0)" }}>
                  ZRX
                </span>
              </div>
            </div>
          </div>
          <p className="mono-tag mt-3" style={{ color: "var(--color-ink-3)" }}>
            SCAN TO OPEN
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <ActionButton icon={Share2} label="Share" onClick={nativeShare} primary />
          <ActionButton
            icon={copied ? Check : Link2}
            label={copied ? "Copied" : "Copy"}
            onClick={copyLink}
          />
          <ActionButton icon={Download} label="Save QR" onClick={downloadQr} disabled={!qr} />
        </div>

        <div
          className="mt-4 flex items-center gap-2 rounded-xl border p-3"
          style={{ borderColor: "var(--color-line)", background: "var(--color-paper-1)" }}
        >
          <p className="flex-1 truncate text-xs mono-num" style={{ color: "var(--color-ink-2)" }}>
            {url}
          </p>
          <button onClick={() => setOpen(false)} className="p-1" aria-label="Close">
            <X size={16} style={{ color: "var(--color-ink-3)" }} />
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  primary = false,
  disabled = false,
}: {
  icon: typeof Share2;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl py-3 transition active:scale-95",
        primary
          ? "bg-[var(--color-neon)] text-[var(--color-ink-0)]"
          : "bg-[var(--color-paper-1)] text-[var(--color-ink-0)] border",
        disabled && "opacity-40 cursor-not-allowed",
      )}
      style={!primary ? { borderColor: "var(--color-line)" } : undefined}
    >
      <Icon size={22} />
      <span className="mono-caps text-[9px]">{label}</span>
    </button>
  );
}
