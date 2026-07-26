import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { logAdEvent } from "@/lib/ads.functions";

type Creative = {
  id: string;
  headline?: string | null;
  body?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  media_url?: string | null;
  campaign?: { id: string; name?: string | null } | null;
};

export function SponsoredCard({ creative, placement }: { creative: Creative; placement: string }) {
  const log = useServerFn(logAdEvent);

  useEffect(() => {
    if (!creative?.campaign?.id) return;
    log({
      data: {
        campaign_id: creative.campaign.id,
        creative_id: creative.id,
        kind: "impression",
        placement: placement as any,
      },
    }).catch(() => {});
  }, [creative?.id]);

  const onClick = async () => {
    if (creative?.campaign?.id) {
      log({
        data: {
          campaign_id: creative.campaign.id,
          creative_id: creative.id,
          kind: "click",
          placement: placement as any,
        },
      }).catch(() => {});
    }
    if (creative.cta_url) {
      const { openExternal } = await import("@/lib/native");
      await openExternal(creative.cta_url);
    }
  };

  return (
    <article
      className="tap overflow-hidden"
      style={{
        background: "var(--color-graphite)",
        border: "1px solid var(--color-hair)",
        borderRadius: 14,
      }}
    >
      <div className="flex items-center justify-between px-4 py-2">
        <span className="mono-tag" style={{ color: "var(--color-neon)", fontSize: 9 }}>
          ◆ SPONSORED
        </span>
        {creative.campaign?.name && (
          <span className="mono-tag" style={{ color: "var(--color-silver)", fontSize: 9 }}>
            {creative.campaign.name}
          </span>
        )}
      </div>
      {creative.media_url && (
        <div className="aspect-video overflow-hidden" style={{ background: "#000" }}>
          {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
          <img
            src={creative.media_url}
            alt={creative.headline ?? "Sponsored"}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4">
        {creative.headline && (
          <h3 className="serif text-lg leading-snug" style={{ color: "var(--color-ink)" }}>
            {creative.headline}
          </h3>
        )}
        {creative.body && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
            {creative.body}
          </p>
        )}
        {(creative.cta_label || creative.cta_url) && (
          <button
            onClick={onClick}
            className="tap mt-3 w-full px-4 py-2.5 text-[12px]"
            style={{
              background: "var(--color-neon)",
              color: "#000",
              borderRadius: 10,
              fontWeight: 600,
              letterSpacing: 0.4,
            }}
          >
            {creative.cta_label ?? "Learn more"}
          </button>
        )}
      </div>
    </article>
  );
}
