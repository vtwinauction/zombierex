import { createFileRoute } from "@tanstack/react-router";
import { LegalShell } from "@/components/legal/LegalShell";

export const Route = createFileRoute("/legal/eula")({
  head: () => ({
    meta: [
      { title: "End User License Agreement · ZOMBIEREX" },
      { name: "description", content: "Apple standard EULA for the ZOMBIEREX mobile application." },
      { property: "og:title", content: "EULA · ZOMBIEREX" },
      { property: "og:description", content: "End User License Agreement." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EulaPage,
});

function EulaPage() {
  return (
    <LegalShell title="End User License Agreement" updated="Effective: July 26, 2026">
      <p>
        This EULA supplements our Terms of Service and applies to the ZOMBIEREX mobile application
        distributed via Apple App Store and Google Play.
      </p>

      <h2>1. License grant</h2>
      <p>
        Subject to your compliance with our Terms, ZOMBIEREX grants you a limited, non-transferable,
        non-exclusive license to install and use the application on devices you own or control.
      </p>

      <h2>2. Restrictions</h2>
      <p>
        You may not (a) copy or redistribute the app; (b) reverse-engineer, decompile, or
        disassemble it; (c) rent, lease, or sublicense it; (d) remove any proprietary notices.
      </p>

      <h2>3. Apple-specific terms</h2>
      <p>If you obtained the app from the Apple App Store, the following applies:</p>
      <ul>
        <li>
          This EULA is between you and ZOMBIEREX, not Apple. Apple is not responsible for the app or
          its content.
        </li>
        <li>
          Your license is limited to using the app on Apple-branded products you own or control, as
          permitted by Apple's Media Services Terms.
        </li>
        <li>Apple has no obligation to provide any maintenance and support services.</li>
        <li>
          ZOMBIEREX is solely responsible for any product warranties. If the app fails to conform to
          any applicable warranty, you may notify Apple, and Apple will refund the purchase price
          (if any).
        </li>
        <li>
          ZOMBIEREX is solely responsible for addressing any user or third-party claims relating to
          the app, including product liability, legal or regulatory compliance, and intellectual
          property claims.
        </li>
        <li>
          Apple and its subsidiaries are third-party beneficiaries of this EULA and may enforce it
          against you.
        </li>
      </ul>

      <h2>4. Google Play</h2>
      <p>
        If you obtained the app from Google Play, your use is also subject to the Google Play Terms
        of Service.
      </p>

      <h2>5. Export controls</h2>
      <p>
        You represent that you are not located in a country subject to a U.S. government embargo and
        are not on any U.S. government prohibited-parties list.
      </p>

      <h2>6. Termination</h2>
      <p>
        This license terminates automatically upon your breach of any term herein or upon deletion
        of the app.
      </p>
    </LegalShell>
  );
}
