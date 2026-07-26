import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

/**
 * Renders a caption with #hashtags → /search?q=%23tag and @mentions → /u/$handle.
 * Preserves whitespace and newlines.
 */
export function RichCaption({
  text,
  className,
  style,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
}) {
  const parts: Array<JSX.Element | string> = [];
  const re = /(#[A-Za-z0-9_]+)|(@[A-Za-z0-9_]{2,32})/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("#")) {
      const tag = token.slice(1);
      parts.push(
        <Link
          key={`t-${i++}`}
          to="/search"
          search={{ q: `#${tag}` } as any}
          className="font-semibold"
          style={{ color: "var(--color-neon, #39FF14)" }}
        >
          {token}
        </Link>,
      );
    } else {
      const handle = token.slice(1);
      parts.push(
        <Link
          key={`m-${i++}`}
          to="/u/$handle"
          params={{ handle }}
          className="font-semibold"
          style={{ color: "var(--color-neon, #39FF14)" }}
        >
          {token}
        </Link>,
      );
    }
    last = m.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <span className={className} style={{ whiteSpace: "pre-wrap", ...style }}>
      {parts}
    </span>
  );
}
