/**
 * Lightweight i18n helper. Locale is user-selected; falls back to English.
 * Formatting utilities delegate to Intl for numbers/dates/relative time.
 */
export type Locale = "en" | "es" | "fr" | "de" | "pt" | "ar";

const DICT: Record<Locale, Record<string, string>> = {
  en: {
    "security.title": "Security Center",
    "security.sessions": "Active devices",
    "security.revoke": "Sign out",
    "security.export": "Download my data",
    "security.delete": "Request account deletion",
    "security.mfa": "Two-factor authentication",
    "security.password": "Change password",
    "common.loading": "Loading…",
    "common.done": "Done",
  },
  es: {
    "security.title": "Centro de Seguridad",
    "security.sessions": "Dispositivos activos",
    "security.revoke": "Cerrar sesión",
    "security.export": "Descargar mis datos",
    "security.delete": "Solicitar eliminación de cuenta",
    "security.mfa": "Autenticación en dos pasos",
    "security.password": "Cambiar contraseña",
    "common.loading": "Cargando…",
    "common.done": "Listo",
  },
  fr: {
    "security.title": "Centre de sécurité",
    "security.sessions": "Appareils actifs",
    "security.revoke": "Se déconnecter",
    "security.export": "Télécharger mes données",
    "security.delete": "Demander la suppression du compte",
    "security.mfa": "Authentification à deux facteurs",
    "security.password": "Changer le mot de passe",
    "common.loading": "Chargement…",
    "common.done": "Terminé",
  },
  de: {
    "security.title": "Sicherheitscenter",
    "security.sessions": "Aktive Geräte",
    "security.revoke": "Abmelden",
    "security.export": "Meine Daten herunterladen",
    "security.delete": "Kontolöschung anfordern",
    "security.mfa": "Zwei-Faktor-Authentifizierung",
    "security.password": "Passwort ändern",
    "common.loading": "Lädt…",
    "common.done": "Fertig",
  },
  pt: {
    "security.title": "Central de Segurança",
    "security.sessions": "Dispositivos ativos",
    "security.revoke": "Sair",
    "security.export": "Baixar meus dados",
    "security.delete": "Solicitar exclusão da conta",
    "security.mfa": "Autenticação de dois fatores",
    "security.password": "Alterar senha",
    "common.loading": "Carregando…",
    "common.done": "Concluído",
  },
  ar: {
    "security.title": "مركز الأمان",
    "security.sessions": "الأجهزة النشطة",
    "security.revoke": "تسجيل الخروج",
    "security.export": "تنزيل بياناتي",
    "security.delete": "طلب حذف الحساب",
    "security.mfa": "المصادقة الثنائية",
    "security.password": "تغيير كلمة المرور",
    "common.loading": "جارٍ التحميل…",
    "common.done": "تم",
  },
};

const LOCALE_KEY = "zombierex.locale.v1";

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const v = (localStorage.getItem(LOCALE_KEY) as Locale | null) ?? "en";
  return (["en", "es", "fr", "de", "pt", "ar"] as Locale[]).includes(v) ? v : "en";
}

export function setLocale(l: Locale) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCALE_KEY, l);
  document.documentElement.lang = l;
  document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
}

export function t(key: string, locale: Locale = getLocale()): string {
  return DICT[locale]?.[key] ?? DICT.en[key] ?? key;
}

export const fmtNumber = (n: number, locale: Locale = getLocale()) =>
  new Intl.NumberFormat(locale).format(n);

export const fmtDate = (d: Date | string, locale: Locale = getLocale()) =>
  new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    typeof d === "string" ? new Date(d) : d,
  );

export function fmtRelative(d: Date | string, locale: Locale = getLocale()) {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const then = typeof d === "string" ? new Date(d).getTime() : d.getTime();
  const diff = (then - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}
