import type { Metadata } from "next";
import { LegalLayout } from "@/components/site/LegalLayout";

export const metadata: Metadata = { title: "Privacy policy | Construction Concierge", description: "How Construction Concierge collects, uses and protects information." };

export default function Privacy() {
  return (
    <LegalLayout title="Privacy policy" updated="November 17, 2026">
      <p>
        Construction Concierge ("we", "us") is a business-management service for subcontractors. This policy explains what information we collect, why, and the choices you have. If anything here is unclear, write to{" "}
        <a href="mailto:hello@constructionconcierge.com">hello@constructionconcierge.com</a>.
      </p>

      <h2>Who this covers</h2>
      <p>
        <b>Visitors</b> to our website and people who book a demo. <b>Customers</b>, meaning the contractors who use the service, and the people they add to it, such as owners, project managers, foremen and crew.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Demo requests:</b> your name, company, email, phone and message, so we can reply.
        </li>
        <li>
          <b>Account details:</b> names, work emails and roles for the people a customer sets up.
        </li>
        <li>
          <b>Work records a customer enters or generates:</b> jobs, schedules, clock-in and clock-out times, GPS position and selfie at punch time, safety checklist and toolbox-talk sign-offs, daily logs, incident reports, T&amp;M tickets with photos and signatures, invoices, bills and cash-flow figures.
        </li>
        <li>
          <b>Pay information:</b> hourly costs a customer enters for job costing. These are visible to the customer's owner and project managers only, not to foremen or crew.
        </li>
        <li>
          <b>Technical data:</b> basic logs such as device type and errors, used to keep the service running.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To provide and secure the service, show customers their own job cost and cash position, respond to enquiries, and fix problems. We do not sell personal information and we do not use customer work records for advertising.
      </p>

      <h2>Who customers' data belongs to</h2>
      <p>
        A customer's work records belong to that customer. We handle them on the customer's behalf. Each company's data is kept separate from every other company's by the database itself, so one customer cannot see another's records.
      </p>

      <h2>Service providers</h2>
      <p>We use trusted providers to run the service. They process data only to provide their service to us:</p>
      <ul>
        <li>Database, sign-in and file storage, hosted in Canada.</li>
        <li>Web hosting.</li>
        <li>Email delivery, used to send T&amp;M copies, follow-ups and demo replies.</li>
        <li>An AI model provider, used only when a customer uses the optional assistant. The assistant sees only what the signed-in user is allowed to see.</li>
        <li>Public map and satellite imagery, used for the jobs map. Addresses may be looked up to place a job on the map.</li>
      </ul>

      <h2>Where it is stored</h2>
      <p>Our database and file storage are located in Canada. Some service providers listed above may process limited data outside Canada.</p>

      <h2>Keeping it</h2>
      <p>
        We keep customer records while the account is active and for a reasonable period afterwards so a customer can export or recover them. Safety and incident records may need to be kept longer for the customer's legal obligations. Ask us to delete what you can have deleted.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or delete personal information we hold about you. If you are a crew member, your employer controls your work records, so start with them. Otherwise write to us and we will respond within 30 days.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, access is limited by role, and company data is isolated at the database level. No system is perfectly secure, so we also ask customers to use strong passwords and keep shared jobsite devices locked down.
      </p>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you signed in and remember your theme. We do not use advertising cookies.</p>

      <h2>Changes</h2>
      <p>If we change this policy in a meaningful way, we will update the date above and tell customers.</p>

      <h2>Contact</h2>
      <p>
        <a href="mailto:hello@constructionconcierge.com">hello@constructionconcierge.com</a>
      </p>
    </LegalLayout>
  );
}
