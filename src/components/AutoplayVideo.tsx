import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type VideoHTMLAttributes } from "react";

/**
 * Video that autoplays muted when visible and pauses off-screen —
 * the IG/TikTok inline-video behavior. Tap toggles play/pause,
 * separate mute control is up to the caller.
 */
export type AutoplayVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "muted"> & {
  src: string;
  poster?: string;
  /** Force play/pause independent of visibility (Reels active slide). */
  forcePlay?: boolean;
  /** External mute control. Default true (autoplay policy). */
  muted?: boolean;
  /** Called with current time / duration each rAF-throttled tick. */
  /** Called with current time / duration each timeupdate. */
  onTime?: (t: number, d: number) => void;
  /** Threshold at which autoplay kicks in. */
  threshold?: number;
  className?: string;
};

export const AutoplayVideo = forwardRef<HTMLVideoElement, AutoplayVideoProps>(function AutoplayVideo({
  src,
  poster,
  forcePlay,
  muted = true,
  onTime,
  threshold = 0.6,
  className,
  onClick,
  ...rest
}, forwardedRef) {
  const ref = useRef<HTMLVideoElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLVideoElement, []);
  const [inView, setInView] = useState(false);

  // Visibility
  useEffect(() => {
    const el = ref.current;
    if (!el || forcePlay !== undefined) return;
    const io = new IntersectionObserver(
      ([e]) => setInView(e.intersectionRatio >= threshold),
      { threshold: [0, threshold, 0.95] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [forcePlay, threshold]);

  // Play/pause
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const should = forcePlay ?? inView;
    if (should) {
      el.play().catch(() => {
        // If unmuted autoplay was blocked, retry muted.
        el.muted = true;
        el.play().catch(() => {});
      });
    } else {
      el.pause();
    }
  }, [inView, forcePlay]);

  // Progress
  useEffect(() => {
    const el = ref.current;
    if (!el || !onTime) return;
    const on = () => onTime(el.currentTime, el.duration || 0);
    el.addEventListener("timeupdate", on);
    return () => el.removeEventListener("timeupdate", on);
  }, [onTime]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted={muted}
      playsInline
      loop
      preload="metadata"
      onClick={onClick}
      className={className}
      {...rest}
    />
  );
}

/** True if a URL looks like a video file we can render inline. */
export function isVideoUrl(u?: string | null): boolean {
  return !!u && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(u);
}
