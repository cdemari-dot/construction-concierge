import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/home";
import { SiteIcon } from "@/components/site/SiteIcon";
import { HeroTicker } from "@/components/site/HeroTicker";
import { ConstructionScene } from "@/components/site/ConstructionScene";
import { TiltDevices } from "@/components/site/TiltDevices";
import { DemoForm } from "@/components/site/DemoForm";

const PROBLEMS = [
  { t: "Job cost shows up weeks late", d: "By the time the numbers land, the job is finished and the margin is already gone." },
  { t: "Cash surprises", d: "Payroll, HST and slow-paying GCs collide, and you find out when the bank balance does." },
  { t: "Paperwork that goes missing", d: "T&M sign-offs, toolbox talks and injury notes live in trucks and text threads." },
];

const FEATURES = [
  { i: "pulse", t: "Live job cost", d: "When your crew punches in, the job's cost starts counting, by the minute, at each person's real hourly cost." },
  { i: "clock", t: "Crew Punch kiosk", d: "A jobsite iPad. PIN, selfie, GPS, gear check and the day's toolbox talk before every clock-in. 10 employee punches included." },
  { i: "phone", t: "Foreman Field app", d: "Today's sites and crew, daily logs, extras, incident reports and T&M tickets from a phone." },
  { i: "receipt", t: "T&M tickets that hold up", d: "Photos, crew hours, equipment and materials, signed on the phone by the GC's super. Print a clean sheet or email a copy." },
  { i: "chart", t: "13-week cash flow", d: "See the weeks that get tight, how much cash you need, and by when. Includes a stress case where customers pay late." },
  { i: "home", t: "What you can afford", d: "How much rent, trucks, insurance and office staff your revenue and margin can carry, and the truck payment you can add." },
  { i: "swap", t: "Change orders and extras", d: "A field extra becomes a priced change order, then goes to the GC. Nothing gets done for free by accident." },
  { i: "target", t: "Bids and follow-ups", d: "A pipeline from lead to won, with automatic follow-up emails on bids that went quiet." },
  { i: "file", t: "Payroll export", d: "Approved hours as a CSV for your payroll provider. We never run payroll or move money." },
  { i: "spark", t: "Ask the CFO agent", d: "Ask about your cash, jobs and who owes you, in plain words. It only sees what you can see." },
];

const SIZES = [
  { t: "Micro", sub: "You, a truck and a few hands", d: "Stop running the business from a notebook and your phone. Know each job's cost and what's in the bank without a bookkeeper." },
  { t: "Small", sub: "A foreman, a crew and an office", d: "Punch clocks, field paperwork and weekly payroll hours without chasing people for photos and signatures." },
  { t: "Medium", sub: "Several crews on several sites", d: "One live view across every job, with cash flow and overhead limits that keep growth from outrunning your cash." },
];

const TRADES = ["Electrical", "Mechanical and HVAC", "Plumbing", "Drywall and framing", "Concrete and masonry", "Demolition and abatement", "Roofing", "Painting and finishing", "Flooring and tile", "Excavation and sitework", "Landscaping", "Specialty trades"];

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
  { q: "Does it handle WSIB filings?", a: "It records injury questions at clock-out and routes incident reports to the office. That is documentation only, not a WSIB filing." },
];

export default async function SiteHome() {
  if (isSupabaseConfigured) {
    const user = await getCurrentUser();
    if (user) redirect(homeFor(user.profile.role));
  }

  return (
    <>
      <header className="site-nav">
        <div className="wrap nav-in">
          <Link href="/" className="brand" aria-label="Construction Concierge home">
            <Image src="/brand/logo-mark.png" alt="" width={34} height={34} priority />
            <span>Construction Concierge</span>
          </Link>
          <nav className="nav-links" aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#who">Who it's for</a>
            <a href="#field">Field apps</a>
            <a href="#how">How it works</a>
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
        <section className="hero-3d">
          <ConstructionScene />
          <div className="hero-veil" aria-hidden="true" />
          <div className="hero wrap">
          <div className="hero-copy">
            <div className="eyebrow">For subcontractors of every trade</div>
            <h1 className="display">
              Know what every job <em>costs</em> while it's still running.
            </h1>
            <p className="lede">
              Construction Concierge is the owner's CFO and back office for subcontractors, from one-truck micro shops to growing medium-size crews. Live job cost from the
              punch clock, cash flow you can trust, and field paperwork that signs itself off.
            </p>
            <div className="hero-cta">
              <a href="#demo" className="site-btn primary lg">
                Book a demo <SiteIcon name="arrow" size={18} />
              </a>
              <Link href="/login" className="site-btn ghost lg">
                Log in
              </Link>
            </div>
            <ul className="hero-points">
              <li>
                <SiteIcon name="check" size={16} /> 10 employee punches included
              </li>
              <li>
                <SiteIcon name="check" size={16} /> One truck or fifty people
              </li>
              <li>
                <SiteIcon name="check" size={16} /> Works on the iPad and phones you already have
              </li>
              <li>
                <SiteIcon name="check" size={16} /> Your data stays in Canada
              </li>
            </ul>
          </div>
          <div className="hero-visual">
            <HeroTicker />
          </div>
          </div>
          <a href="#features" className="scroll-cue" aria-label="Scroll to features">
            <span />
          </a>
        </section>

        <section className="band">
          <div className="wrap">
            <h2 className="display sec-title">Where subcontractors lose money</h2>
            <div className="grid3">
              {PROBLEMS.map((p, i) => (
                <article key={p.t} className="card cc-in" style={{ "--i": i } as React.CSSProperties}>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="wrap sec">
          <div className="eyebrow">Everything in one place</div>
          <h2 className="display sec-title">One system from the punch clock to the bank balance</h2>
          <div className="grid-feat">
            {FEATURES.map((f, i) => (
              <article key={f.t} className="feat cc-in" style={{ "--i": i } as React.CSSProperties}>
                <span className="feat-ic">
                  <SiteIcon name={f.i} />
                </span>
                <h3>{f.t}</h3>
                <p>{f.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="who" className="wrap sec">
          <div className="eyebrow">Who it's for</div>
          <h2 className="display sec-title">Built for the sub, not the general contractor</h2>
          <div className="grid3">
            {SIZES.map((z, i) => (
              <article key={z.t} className="card cc-in" style={{ "--i": i } as React.CSSProperties}>
                <h3>{z.t}</h3>
                <p className="duo-sub">{z.sub}</p>
                <p>{z.d}</p>
              </article>
            ))}
          </div>
          <ul className="chips" aria-label="Trades">
            {TRADES.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section id="field" className="band">
          <div className="wrap field">
            <div>
              <div className="eyebrow">Two apps for the field</div>
              <h2 className="display sec-title left">Your crew punches in. Your foreman runs the day.</h2>
              <p className="lede sm">Each is its own app that installs to the home screen. Neither needs the app store, and both talk straight to your Construction Concierge.</p>
              <TiltDevices />
              <div className="duo">
                <div className="duo-card">
                  <span className="feat-ic">
                    <SiteIcon name="clock" />
                  </span>
                  <h3>Crew Punch</h3>
                  <p className="duo-sub">For the jobsite iPad</p>
                  <ul>
                    <li>4-digit PIN, no passwords in muddy gloves</li>
                    <li>Selfie and GPS stamped on every punch</li>
                    <li>Gear check, then the day's toolbox talk</li>
                    <li>Injury question and a shift note at clock-out</li>
                    <li>Flags anyone punching in off schedule</li>
                  </ul>
                </div>
                <div className="duo-card">
                  <span className="feat-ic">
                    <SiteIcon name="phone" />
                  </span>
                  <h3>Field</h3>
                  <p className="duo-sub">For foremen on a phone</p>
                  <ul>
                    <li>Today's sites, crew and who's late</li>
                    <li>Daily logs, extras and incident reports</li>
                    <li>T&amp;M tickets with photos and a signature</li>
                    <li>Site weather at a glance</li>
                    <li>Never shows what anyone is paid</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="wrap sec">
          <div className="eyebrow">How it works</div>
          <h2 className="display sec-title">From setup to a live picture of your business</h2>
          <div className="grid3">
            {STEPS.map((s, i) => (
              <article key={s.n} className="step cc-in" style={{ "--i": i } as React.CSSProperties}>
                <span className="step-n display">{s.n}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="band">
          <div className="wrap trust">
            <div className="trust-item">
              <SiteIcon name="lock" />
              <div>
                <h3>Your data stays yours</h3>
                <p>Every company's records are isolated by the database itself, and hosted in Canada.</p>
              </div>
            </div>
            <div className="trust-item">
              <SiteIcon name="shield" />
              <div>
                <h3>Pay stays private</h3>
                <p>Hourly costs are visible to the owner and PM only, never to foremen or crew.</p>
              </div>
            </div>
            <div className="trust-item">
              <SiteIcon name="users" />
              <div>
                <h3>You stay in control</h3>
                <p>No payroll runs and no money movement. We show you the numbers and export the hours.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="wrap sec narrow">
          <div className="eyebrow">Questions</div>
          <h2 className="display sec-title">Straight answers</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="demo" className="band demo">
          <div className="wrap demo-in">
            <div>
              <div className="eyebrow">See it with your own jobs</div>
              <h2 className="display sec-title left">Book a demo</h2>
              <p className="lede sm">A short walkthrough for your trade, your crew size and your numbers. Pricing is shared on the call, so you only hear about what fits your company.</p>
              <ul className="hero-points col">
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
            <div className="demo-card">
              <DemoForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="site-foot">
        <div className="wrap foot-in">
          <div className="brand">
            <Image src="/brand/logo-mark.png" alt="" width={28} height={28} />
            <span>Construction Concierge</span>
          </div>
          <nav aria-label="Footer">
            <a href="#features">Features</a>
            <a href="#demo">Book a demo</a>
            <Link href="/login">Log in</Link>
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
