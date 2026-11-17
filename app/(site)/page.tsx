import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/home";
import { SiteIcon } from "@/components/site/SiteIcon";
import { HeroTicker } from "@/components/site/HeroTicker";
import { DemoForm } from "@/components/site/DemoForm";
import { TiltDevices } from "@/components/site/TiltDevices";
import { ScrollFX } from "@/components/site/ScrollFX";

const TRADES = ["Electrical", "Mechanical and HVAC", "Plumbing", "Drywall and framing", "Concrete and masonry", "Demolition and abatement", "Roofing", "Painting and finishing", "Flooring and tile", "Excavation and sitework", "Landscaping", "Specialty trades"];

const PROBLEMS = [
  { n: "01", t: "Job cost shows up weeks late.", d: "By the time the numbers land, the job is finished and the margin is already gone." },
  { n: "02", t: "Cash surprises you.", d: "Payroll, HST and slow-paying GCs collide, and you find out when the bank balance does." },
  { n: "03", t: "Paperwork goes missing.", d: "T&M sign-offs, toolbox talks and injury notes live in trucks and text threads." },
];

type Tile = { i: string; t: string; d: string; size?: "wide" | "tall" | "ink" };
const FEATURES: Tile[] = [
  { i: "pulse", t: "Live job cost", d: "When your crew punches in, the job's cost starts counting, by the minute, at each person's real hourly cost.", size: "ink" },
  { i: "clock", t: "Crew Punch kiosk", d: "A jobsite iPad. PIN, selfie, GPS, gear check and the day's toolbox talk before every clock-in. 10 employee punches included." },
  { i: "phone", t: "Foreman Field app", d: "Today's sites and crew, daily logs, extras, incident reports and T&M tickets from a phone." },
  { i: "receipt", t: "T&M tickets that hold up", d: "Photos, crew hours, equipment and materials, signed on the phone by the GC's super. Print a clean sheet or email a copy.", size: "wide" },
  { i: "chart", t: "13-week cash flow", d: "See the weeks that get tight, how much cash you need, and by when. Includes a stress case where customers pay late.", size: "ink" },
  { i: "home", t: "What you can afford", d: "How much rent, trucks, insurance and office staff your revenue and margin can carry, and the truck payment you can add." },
  { i: "swap", t: "Change orders and extras", d: "A field extra becomes a priced change order, then goes to the GC. Nothing gets done for free by accident." },
  { i: "target", t: "Bids and follow-ups", d: "A pipeline from lead to won, with automatic follow-up emails on bids that went quiet." },
  { i: "file", t: "Payroll export", d: "Approved hours as a CSV for your payroll provider. We never run payroll or move money." },
  { i: "spark", t: "Ask the CFO agent", d: "Ask about your cash, jobs and who owes you, in plain words. It only sees what you can see.", size: "wide" },
];

const SIZES = [
  { t: "Micro", sub: "You, a truck and a few hands", d: "Stop running the business from a notebook and your phone. Know each job's cost and what's in the bank without a bookkeeper." },
  { t: "Small", sub: "A foreman, a crew and an office", d: "Punch clocks, field paperwork and weekly payroll hours without chasing people for photos and signatures." },
  { t: "Medium", sub: "Several crews on several sites", d: "One live view across every job, with cash flow and overhead limits that keep growth from outrunning your cash." },
];

const STEPS = [
  { n: "1", t: "Set up in an afternoon", d: "Add your jobs, crew and each person's hourly cost. Give every worker a 4-digit PIN." },
  { n: "2", t: "The field does what it already does", d: "Crew punches in at the kiosk. The foreman logs the day and gets T&M signed on the phone." },
  { n: "3", t: "You see the business, live", d: "Job cost ticking, cash for the next 13 weeks, and every sign-off in one place." },
];

const FAQ = [
  { q: "Do you run payroll?", a: "No. We produce a weekly CSV of approved hours for your payroll provider. We never run payroll, hold money or move money." },
  { q: "Do my crew need accounts or an app store download?", a: "Workers just use a 4-digit PIN on a shared jobsite iPad. Foremen use a web app that installs to the home screen, with no app store." },
  { q: "Can the foreman see what people are paid?", a: "No. Hourly costs are visible to the owner and PM only. The foreman's app never shows pay." },
  { q: "Where is our data kept?", a: "In Canada, on a managed database in Montreal. Every company's data is isolated from every other company's by the database itself." },
  { q: "Is this accounting software?", a: "No. It's the owner's view of the business: job cost, cash and field records. It tracks invoices and bills so the numbers work, but it isn't a full accounting package." },
  { q: "Are the financial models advice?", a: "No. They are suggestions only and never replace your accountant, bookkeeper or other professional. See our terms." },
  { q: "Does it handle WSIB filings?", a: "It records injury questions at clock-out and routes incident reports to the office. That is documentation only, not a WSIB filing." },
];

export default async function SiteHome() {
  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    if (user) redirect(homeFor(user.profile.role));
  }
  const marquee = [...TRADES, ...TRADES];

  return (
    <>
      <ScrollFX />
      <header className="site-nav">
        <div className="wrap nav-in">
          <Link href="/" className="brand" aria-label="Construction Concierge home">
            <Image src="/brand/logo-mark.png" alt="" width={30} height={30} priority />
            <span>Construction Concierge</span>
          </Link>
          <nav className="nav-links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#who">Who it&apos;s for</a>
            <a href="#field">Field apps</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="nav-cta">
            <Link href="/login" className="site-btn ghost">
              Log in
            </Link>
            <a href="#demo" className="site-btn primary">
              Book a demo
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="hero wrap">
          <div className="tag rv">For subcontractors of every trade</div>
          <h1 className="mega rv" style={{ "--d": "80ms" } as React.CSSProperties}>
            Know what every job costs. <em>Live.</em>
          </h1>
          <p className="lede rv" style={{ "--d": "160ms" } as React.CSSProperties}>
            The owner&apos;s CFO and back office for subcontractors, from one-truck micro shops to growing medium-size crews. Live job cost from the punch clock, cash flow you can trust, and field
            paperwork that signs itself off.
          </p>
          <div className="hero-cta rv" style={{ "--d": "240ms" } as React.CSSProperties}>
            <a href="#demo" className="site-btn primary lg">
              Book a demo
            </a>
            <Link href="/login" className="site-btn ghost lg">
              Log in
            </Link>
          </div>
          <div className="included rv" style={{ "--d": "320ms" } as React.CSSProperties}>
            <span>Included</span> 10 employee punches
          </div>
          <div className="hero-product rv" style={{ "--d": "200ms" } as React.CSSProperties}>
            <HeroTicker />
          </div>
        </section>

        <div className="marquee" aria-label="Trades we serve">
          <div className="marquee-track">
            {marquee.map((t, i) => (
              <span key={i}>
                {t}
                <i aria-hidden="true">/</i>
              </span>
            ))}
          </div>
        </div>

        <section className="wrap sec">
          <div className="tag rv">The problem</div>
          <h2 className="big rv">Where subcontractors lose money.</h2>
          <div className="problems">
            {PROBLEMS.map((p, i) => (
              <article key={p.n} className="problem rv" style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
                <span className="pn">{p.n}</span>
                <h3>{p.t}</h3>
                <p>{p.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="features" className="wrap sec">
          <div className="tag rv">Everything in one place</div>
          <h2 className="big rv">One system, from the punch clock to the bank balance.</h2>
          <div className="bento">
            {FEATURES.map((f, i) => (
              <article key={f.t} className={`tile ${f.size ?? ""} rv`} style={{ "--d": `${(i % 3) * 80}ms` } as React.CSSProperties}>
                <span className="tile-ic">
                  <SiteIcon name={f.i} size={24} />
                </span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="who" className="wrap sec">
          <div className="tag rv">Who it&apos;s for</div>
          <h2 className="big rv">Built for the sub, not the general contractor.</h2>
          <div className="sizes">
            {SIZES.map((z, i) => (
              <article key={z.t} className="size rv" style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
                <h3>{z.t}</h3>
                <small>{z.sub}</small>
                <p>{z.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="field" className="dark">
          <div className="wrap sec">
            <div className="tag light rv">Two apps for the field</div>
            <h2 className="big light rv">Your crew punches in. Your foreman runs the day.</h2>
            <p className="lede light rv">Each is its own app that installs to the home screen. Neither needs the app store, and both talk straight to your Construction Concierge.</p>
            <div className="rv">
              <TiltDevices />
            </div>
            <div className="duo">
              <div className="duo-card rv">
                <h3>Crew Punch</h3>
                <small>For the jobsite iPad</small>
                <ul>
                  <li>4-digit PIN, no passwords in muddy gloves</li>
                  <li>Selfie and GPS stamped on every punch</li>
                  <li>Gear check, then the day&apos;s toolbox talk</li>
                  <li>Injury question and a shift note at clock-out</li>
                  <li>Flags anyone punching in off schedule</li>
                </ul>
              </div>
              <div className="duo-card rv" style={{ "--d": "90ms" } as React.CSSProperties}>
                <h3>Field</h3>
                <small>For foremen on a phone</small>
                <ul>
                  <li>Today&apos;s sites, crew and who&apos;s late</li>
                  <li>Daily logs, extras and incident reports</li>
                  <li>T&amp;M tickets with photos and a signature</li>
                  <li>Site weather at a glance</li>
                  <li>Never shows what anyone is paid</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="wrap sec">
          <div className="tag rv">How it works</div>
          <h2 className="big rv">From setup to a live picture of your business.</h2>
          <div className="steps">
            {STEPS.map((s, i) => (
              <article key={s.n} className="step rv" style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
                <span className="sn">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="wrap sec trust-sec">
          <div className="trust">
            <div className="trust-item rv">
              <SiteIcon name="lock" />
              <h3>Your data stays yours</h3>
              <p>Every company&apos;s records are isolated by the database itself, and hosted in Canada.</p>
            </div>
            <div className="trust-item rv" style={{ "--d": "90ms" } as React.CSSProperties}>
              <SiteIcon name="shield" />
              <h3>Pay stays private</h3>
              <p>Hourly costs are visible to the owner and PM only, never to foremen or crew.</p>
            </div>
            <div className="trust-item rv" style={{ "--d": "180ms" } as React.CSSProperties}>
              <SiteIcon name="users" />
              <h3>You stay in control</h3>
              <p>No payroll runs and no money movement. We show you the numbers and export the hours.</p>
            </div>
          </div>
        </section>

        <section id="faq" className="wrap sec narrow">
          <div className="tag rv">Questions</div>
          <h2 className="big rv">Straight answers.</h2>
          <div className="faq rv">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="demo" className="wrap sec">
          <div className="demo-panel">
            <div className="demo-copy">
              <div className="tag light rv">See it with your own jobs</div>
              <h2 className="big light rv">Book a demo.</h2>
              <p className="lede light rv">A short walkthrough for your trade, your crew size and your numbers. Pricing is shared on the call, so you only hear about what fits your company.</p>
              <ul className="checks rv">
                <li>
                  <SiteIcon name="check" size={16} /> Includes the crew punch clock for 10 employees
                </li>
                <li>
                  <SiteIcon name="check" size={16} /> About 30 minutes
                </li>
                <li>
                  <SiteIcon name="check" size={16} /> No obligation
                </li>
                <li>
                  <SiteIcon name="check" size={16} /> We reply within one business day
                </li>
              </ul>
            </div>
            <div className="demo-card rv">
              <DemoForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="wrap">
          <div className="foot-word" aria-hidden="true">
            Construction
            <br />
            Concierge
          </div>
          <div className="foot-in">
            <nav aria-label="Footer">
              <a href="#features">Features</a>
              <a href="#demo">Book a demo</a>
              <Link href="/login">Log in</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/terms">Terms</Link>
              <a href="mailto:hello@constructionconcierge.ai">hello@constructionconcierge.ai</a>
            </nav>
            <small>© {new Date().getFullYear()} Construction Concierge. All rights reserved.</small>
          </div>
        </div>
      </footer>
    </>
  );
}
