/**
 * Biometric authentication wrapper (FaceID / TouchID / Fingerprint).
 * Uses @capacitor-community/biometric-auth when available on native, and
 * falls back to WebAuthn platform authenticator on the web when possible.
 * All calls are safe to invoke on any platform — they resolve gracefully.
 */
import { isNative } from "./index";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NativeBio = any;

async function loadNative(): Promise<NativeBio | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await import(/* @vite-ignore */ "@capacitor-community/biometric-auth");
    return mod?.BiometricAuth ?? mod?.default ?? mod ?? null;
  } catch {
    return null;
  }
}

export type BiometryKind = "faceId" | "touchId" | "fingerprint" | "iris" | "none";

export type BiometryAvailability = {
  available: boolean;
  kind: BiometryKind;
  reason?: string;
};

export async function checkBiometricAvailability(): Promise<BiometryAvailability> {
  if (isNative()) {
    const bio = await loadNative();
    if (bio?.checkBiometry) {
      try {
        const res = await bio.checkBiometry();
        const t = String(res?.biometryType ?? "").toLowerCase();
        const kind: BiometryKind =
          t.includes("face") ? "faceId" :
          t.includes("touch") ? "touchId" :
          t.includes("finger") ? "fingerprint" :
          t.includes("iris") ? "iris" : "none";
        return { available: !!res?.isAvailable, kind, reason: res?.reason };
      } catch (e) {
        return { available: false, kind: "none", reason: (e as Error)?.message };
      }
    }
    return { available: false, kind: "none", reason: "Plugin missing" };
  }
  // Web fallback via WebAuthn platform authenticator.
  try {
    const pac = (window as unknown as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential;
    const ok = await pac?.isUserVerifyingPlatformAuthenticatorAvailable?.();
    return { available: !!ok, kind: ok ? "fingerprint" : "none" };
  } catch {
    return { available: false, kind: "none" };
  }
}

export async function authenticateBiometric(reason = "Unlock ZOMBIEREX"): Promise<boolean> {
  if (isNative()) {
    const bio = await loadNative();
    if (bio?.authenticate) {
      try {
        await bio.authenticate({
          reason,
          cancelTitle: "Cancel",
          allowDeviceCredential: true,
          iosFallbackTitle: "Use passcode",
          androidTitle: "ZOMBIEREX",
          androidSubtitle: reason,
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
  // Web fallback: prompt platform authenticator via a discoverable get() ceremony.
  try {
    if (!("credentials" in navigator)) return false;
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        timeout: 30_000,
        userVerification: "required",
        rpId: window.location.hostname,
      },
      mediation: "optional",
    } as CredentialRequestOptions);
    return true;
  } catch {
    // If no credential is registered we still consider a completed user-verify UI a pass;
    // on failure/cancel, deny.
    return false;
  }
}

const LOCK_KEY = "zombierex.appLock.v1";
export type AppLockPrefs = { enabled: boolean; graceMs: number };
const DEFAULTS: AppLockPrefs = { enabled: false, graceMs: 60_000 };

export function loadAppLockPrefs(): AppLockPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(LOCK_KEY) || "{}") }; }
  catch { return DEFAULTS; }
}
export function saveAppLockPrefs(p: AppLockPrefs) {
  try { localStorage.setItem(LOCK_KEY, JSON.stringify(p)); } catch { /* quota */ }
}
