import Image from "next/image";
import Link from "next/link";
import "@/app/(site)/site.css";
import { HeroTicker } from "./HeroTicker";

// Shared frame for the sign-in pages (login, invite, onboarding): same look as the public site.
export function AuthShell({ tag, title, lede, children, foot }: { tag: string; title: string; lede?: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <div className="site auth-page">
      <header className="site-nav">
        <div className="wrap nav-in">
          <Link href="/" className="brand" aria-label="Construction Concierge home">
            <Image src="/brand/logo-mark.png" alt="" width={30} height={30} priority />
            <span>Construction Concierge</span>
          </Link>
          <div className="nav-cta">
            <Link href="/" className="site-btn ghost">
              Back to site
            </Link>
          </div>
        </div>
      </header>
      <main className="auth wrap">
        <section className="auth-main">
          <div className="tag">{tag}</div>
          <h1 className="auth-title">{title}</h1>
          {lede && <p className="auth-lede">{lede}</p>}
          {children}
          {foot && <div className="auth-foot">{foot}</div>}
          <p className="auth-legal">
            <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <a href="mailto:hello@constructionconcierge.ai">hello@constructionconcierge.ai</a>
          </p>
        </section>
        <aside className="auth-side" aria-hidden="true">
          <HeroTicker compact />
          <p className="auth-side-note">Job cost, cash flow and field paperwork for subcontractors, live.</p>
        </aside>
      </main>
    </div>
  );
}

export function AuthField({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
}) {
  return (
    <label className="auth-field">
      {label}
      <input type={type} value={value} required={required} minLength={minLength} autoComplete={autoComplete} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
