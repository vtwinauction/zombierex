/**
 * GPX import/export for Route Atlas.
 * Supports GPX 1.1 tracks and waypoints.
 */

export type GpxPoint = { lat: number; lng: number; ele?: number; name?: string; recorded_at?: string };

export function parseGpx(xml: string): { path: GpxPoint[]; waypoints: GpxPoint[]; name?: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, "application/xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Invalid GPX file");

  const ns = doc.documentElement.namespaceURI ?? "http://www.topografix.com/GPX/1/1";
  const resolver = (prefix: string | null) => {
    if (!prefix) return ns;
    return prefix === "" ? ns : null;
  };

  const path: GpxPoint[] = [];
  const trackPoints = doc.evaluate("//trkpt", doc, resolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  for (let i = 0; i < trackPoints.snapshotLength; i++) {
    const node = trackPoints.snapshotItem(i) as Element;
    const lat = parseFloat(node.getAttribute("lat") ?? "");
    const lng = parseFloat(node.getAttribute("lon") ?? "");
    const ele = parseFloat(node.querySelector("ele")?.textContent ?? "NaN");
    if (isNaN(lat) || isNaN(lng)) continue;
    path.push({ lat, lng, ...(isNaN(ele) ? {} : { ele }) });
  }

  const waypoints: GpxPoint[] = [];
  const wptNodes = doc.evaluate("//wpt", doc, resolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  for (let i = 0; i < wptNodes.snapshotLength; i++) {
    const node = wptNodes.snapshotItem(i) as Element;
    const lat = parseFloat(node.getAttribute("lat") ?? "");
    const lng = parseFloat(node.getAttribute("lon") ?? "");
    const ele = parseFloat(node.querySelector("ele")?.textContent ?? "NaN");
    const name = node.querySelector("name")?.textContent ?? undefined;
    if (isNaN(lat) || isNaN(lng)) continue;
    waypoints.push({ lat, lng, ...(isNaN(ele) ? {} : { ele }), ...(name ? { name } : {}) });
  }

  const name = doc.querySelector("trk > name")?.textContent ?? doc.querySelector("metadata > name")?.textContent ?? undefined;
  return { path, waypoints, name };
}

export function buildGpx(title: string, path: { lat: number; lng: number }[], waypoints?: { lat: number; lng: number; name?: string }[]): string {
  const now = new Date().toISOString();
  const escape = (s?: string) =>
    s ? s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : "";

  const trkpt = path.map((p) => `    <trkpt lat="${p.lat.toFixed(7)}" lon="${p.lng.toFixed(7)}"></trkpt>`).join("\n");
  const wpts = (waypoints ?? [])
    .map((w) => `  <wpt lat="${w.lat.toFixed(7)}" lon="${w.lng.toFixed(7)}">\n    <name>${escape(w.name)}</name>\n  </wpt>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ZOMBIEREX Atlas" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escape(title)}</name>
    <time>${now}</time>
  </metadata>
${wpts}
  <trk>
    <name>${escape(title)}</name>
    <trkseg>
${trkpt}
    </trkseg>
  </trk>
</gpx>`;
}

export function downloadGpx(filename: string, gpx: string) {
  const blob = new Blob([gpx], { type: "application/gpx+xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".gpx") ? filename : `${filename}.gpx`;
  a.click();
  URL.revokeObjectURL(url);
}
