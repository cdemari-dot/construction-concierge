import Image from "next/image";
import Link from "next/link";

// Shared frame for the Privacy and Terms pages.
export function LegalLayout({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <header className="site-nav">
        <div className="wrap nav-in">
          <Link href="/" className="brand" aria-label="Construction Concierge home">
            <Image src="/brand/logo-mark.png" alt="" width={34} height={34} />
            <span>Construction Concierge</span>
          </Link>
          <div className="nav-cta">
            <Link href="/" className="site-btn ghost">
              Home
            </Link>
            <Link href="/login" className="site-btn primary">
              Log in
            </Link>
          </div>
        </div>
      </header>
      <main className="legal wrap">
        <h1 className="display">{title}</h1>
        <p className="legal-updated">Last updated {updated}</p>
        {children}
      </main>
      <footer className="site-foot">
        <div className="wrap foot-in">
          <div className="brand">
            <Image src="/brand/logo-mark.png" alt="" width={28} height={28} />
            <span>Construction Concierge</span>
          </div>
          <nav aria-label="Footer">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:hello@constructionconcierge.com">hello@constructionconcierge.com</a>
          </nav>
          <small>© {new Date().getFullYear()} Construction Concierge. All rights reserved.</small>
        </div>
      </footer>
    </>
  );
}
