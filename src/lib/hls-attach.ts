/**
 * Attach an HLS stream to a <video> element.
 * Safari plays .m3u8 natively; everywhere else we lazy-load hls.js so the
 * library never enters the SSR bundle or the initial page payload.
 */
export function isHlsUrl(u?: string | null): boolean {
  return !!u && /\.m3u8(\?|#|$)/i.test(u);
}

export type HlsHandle = { destroy: () => void };

export async function attachHls(video: HTMLVideoElement, src: string): Promise<HlsHandle> {
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = src;
    return { destroy: () => {} };
  }
  const { default: Hls } = await import("hls.js");
  if (!Hls.isSupported()) {
    video.src = src;
    return { destroy: () => {} };
  }
  const hls = new Hls({
    // Tuned for short-form vertical video: start fast, keep buffer small.
    maxBufferLength: 12,
    maxMaxBufferLength: 30,
    startLevel: -1,
    capLevelToPlayerSize: true,
    lowLatencyMode: false,
  });
  hls.loadSource(src);
  hls.attachMedia(video);
  return { destroy: () => hls.destroy() };
}
