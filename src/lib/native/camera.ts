/**
 * Native camera helper. Returns a File captured/picked via Capacitor
 * Camera on device, or null when unavailable (caller falls back to the
 * hidden <input type="file" capture>).
 */
import { isNative } from "./index";
import { loadPlugin } from "./plugins";


type CamMod = {
  Camera: {
    checkPermissions: () => Promise<{ camera: string; photos: string }>;
    requestPermissions: (o?: { permissions?: string[] }) => Promise<{ camera: string; photos: string }>;
    getPhoto: (o: {
      quality?: number;
      allowEditing?: boolean;
      resultType: unknown;
      source?: unknown;
      saveToGallery?: boolean;
      width?: number;
      height?: number;
    }) => Promise<{ dataUrl?: string; webPath?: string; format: string }>;
  };
  CameraResultType: { Uri: unknown; DataUrl: unknown };
  CameraSource: { Camera: unknown; Photos: unknown; Prompt: unknown };
};

export type CameraKind = "photo" | "gallery" | "prompt";

export async function pickNativePhoto(kind: CameraKind = "prompt"): Promise<File | null> {
  if (!isNative()) return null;
  const mod = await loadPlugin<CamMod>("@capacitor/camera");
  if (!mod) return null;
  const { Camera, CameraResultType, CameraSource } = mod;

  try {
    let perm = await Camera.checkPermissions();
    if (perm.camera !== "granted" || perm.photos !== "granted") {
      perm = await Camera.requestPermissions({ permissions: ["camera", "photos"] });
    }
  } catch { /* proceed — getPhoto will surface the error */ }

  const source = kind === "photo" ? CameraSource.Camera : kind === "gallery" ? CameraSource.Photos : CameraSource.Prompt;

  try {
    const shot = await Camera.getPhoto({
      quality: 92,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source,
      saveToGallery: false,
    });
    const dataUrl = shot.dataUrl;
    if (!dataUrl) return null;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const ext = (shot.format || "jpg").toLowerCase();
    return new File([blob], `capture-${Date.now()}.${ext}`, { type: blob.type || `image/${ext}` });
  } catch {
    return null;
  }
}
