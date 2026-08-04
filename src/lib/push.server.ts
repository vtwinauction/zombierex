/**
 * Firebase Cloud Messaging v1 sender — server-only.
 *
 * Mints an OAuth2 access token from the service-account JSON stored in
 * FCM_SERVICE_ACCOUNT_JSON using RS256 (Web Crypto SubtleCrypto — works on
 * Cloudflare Workers) and posts to
 * https://fcm.googleapis.com/v1/projects/{project_id}/messages:send.
 *
 * APNs is handled by FCM when the token was registered via APNs-integrated
 * Firebase (recommended). For direct APNs we can add a signer later.
 */

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri: string;
};

let cached: { token: string; exp: number } | null = null;

function b64url(bytes: ArrayBuffer | Uint8Array | string): string {
  let str: string;
  if (typeof bytes === "string") str = btoa(bytes);
  else {
    const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let bin = "";
    for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
    str = btoa(bin);
  }
  return str.replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function loadServiceAccount(): ServiceAccount {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FCM_SERVICE_ACCOUNT_JSON is not configured");
  const sa = JSON.parse(raw) as ServiceAccount;
  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    throw new Error("FCM service account is missing required fields");
  }
  return sa;
}

async function getAccessToken(): Promise<{ token: string; projectId: string }> {
  const sa = loadServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return { token: cached.token, projectId: sa.project_id };

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${b64url(sig)}`;

  const res = await fetch(claim.aud, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`FCM token exchange failed [${res.status}]: ${text}`);
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, exp: now + (j.expires_in ?? 3500) };
  return { token: j.access_token, projectId: sa.project_id };
}

export type PushMessage = {
  token: string;
  title: string;
  body?: string;
  data?: Record<string, string>;
  path?: string;
};

export type PushResult = { token: string; ok: boolean; status: number; error?: string };

export async function sendPush(msg: PushMessage): Promise<PushResult> {
  const { token, projectId } = await getAccessToken();
  const data: Record<string, string> = { ...(msg.data ?? {}) };
  if (msg.path) data.path = msg.path;

  const payload = {
    message: {
      token: msg.token,
      notification: { title: msg.title, body: msg.body ?? "" },
      data,
      android: { priority: "HIGH" as const, notification: { channel_id: "zombierex_default" } },
      apns: { payload: { aps: { sound: "default", "content-available": 1 } } },
    },
  };

  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (res.ok) return { token: msg.token, ok: true, status: res.status };
  const text = await res.text().catch(() => "");
  return { token: msg.token, ok: false, status: res.status, error: text.slice(0, 500) };
}

/** Tokens that FCM says are permanently invalid — the caller should delete them. */
export function isPermanentPushFailure(r: PushResult): boolean {
  if (r.ok) return false;
  if (r.status === 404) return true;
  if (
    r.status === 400 &&
    /INVALID_ARGUMENT|invalid registration|not a valid FCM/i.test(r.error ?? "")
  )
    return true;
  if (r.status === 403 && /SenderIdMismatch/i.test(r.error ?? "")) return true;
  return false;
}
