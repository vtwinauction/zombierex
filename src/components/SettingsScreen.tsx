import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { StatusBar } from "@/components/StatusBar";

export function SettingsScreen({
  index,
  section,
  title,
  subtitle,
  children,
}: {
  index: string;
  section: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="pb-24">
      <StatusBar index={index} section={section} />
      <header className="px-5 pt-6">
        <Link to="/settings" className="mono-tag" style={{ color: "var(--color-titanium)" }}>
          ← Back to settings
        </Link>
        <h1 className="serif mt-2 text-3xl leading-tight" style={{ color: "var(--color-ink)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[13px]" style={{ color: "var(--color-silver)" }}>
            {subtitle}
          </p>
        )}
      </header>
      <div className="mt-6 px-3">{children}</div>
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <section
      className="rounded-[10px] p-4"
      style={{ background: "var(--color-graphite)", border: "1px solid var(--color-hair)" }}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mono-tag mb-1" style={{ color: "var(--color-silver)" }}>
        {label}
      </div>
      {children}
      {hint && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--color-silver)" }}>
          {hint}
        </p>
      )}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={"w-full rounded-md px-3 py-2 text-[14px] outline-none " + (props.className ?? "")}
      style={{
        background: "var(--color-graphite)",
        color: "var(--color-ink)",
        border: "1px solid var(--color-hair-strong)",
      }}
    />
  );
}

export function PrimaryButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={
        "tap w-full rounded-md px-4 py-3 text-[13px] font-semibold " + (rest.className ?? "")
      }
      style={{ background: "var(--color-neon)", color: "#000", opacity: rest.disabled ? 0.6 : 1 }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={"tap w-full rounded-md px-4 py-3 text-[13px] " + (rest.className ?? "")}
      style={{
        background: "transparent",
        color: "var(--color-ink)",
        border: "1px solid var(--color-hair-strong)",
      }}
    >
      {children}
    </button>
  );
}
