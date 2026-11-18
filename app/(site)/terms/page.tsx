import type { Metadata } from "next";
import { LegalLayout } from "@/components/site/LegalLayout";

export const metadata: Metadata = { title: "Terms of service | Construction Concierge", description: "The terms for using Construction Concierge." };

export default function Terms() {
  return (
    <LegalLayout title="Terms of service" updated="November 17, 2026">
      <p>
        These terms apply when you use Construction Concierge ("the service"). By using the service you agree to them on behalf of yourself and the company you represent. Questions go to{" "}
        <a href="mailto:hello@constructionconcierge.ai">hello@constructionconcierge.ai</a>.
      </p>

      <h2>The service</h2>
      <p>
        Construction Concierge gives subcontractors job costing from the punch clock, cash-flow planning, field apps for foremen and crew, T&amp;M tickets, and related tools. We may improve, change or remove features over time.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not run payroll, hold money or move money. We produce hours and reports that you give to your own payroll provider.</li>
        <li>We are not an accounting package, and we do not file WSIB claims or tax returns. Safety and injury questions in the service are for your records only.</li>
      </ul>

      <h2>Suggestions only, never a replacement for a professional</h2>
      <p>
        Everything the service produces, including the 13-week cash forecast, the finance coach, "what you can afford" limits, growth and capacity guidance, job-cost and margin figures, cash-injection estimates and reserves is a <b>suggestion only</b>. These are rule-based and estimate-based planning aids that depend entirely on the information entered and on assumptions that may be incomplete or wrong. They are not a forecast we guarantee.
      </p>
      <ul>
        <li>
          They are <b>not</b> financial, accounting, tax, investment, lending, legal, insurance, HR, payroll, health-and-safety or other professional advice, and they do not create a professional relationship between you and us.
        </li>
        <li>
          They must <b>in no way take the place of</b> your accountant, bookkeeper, lawyer, tax adviser, banker, insurer, safety professional or other qualified professional. Talk to the right professional before acting on them, especially for borrowing, hiring, buying vehicles or equipment, tax filings, WSIB, payroll or contract decisions.
        </li>
        <li>You stay solely responsible for your own business decisions and for how you rely on anything the service shows.</li>
        <li>We are not responsible for losses or decisions that result from relying on these suggestions.</li>
      </ul>

      <h2>Accounts</h2>
      <p>
        You are responsible for the people you add, the roles you give them, and keeping logins and shared jobsite devices secure. Tell us promptly if you think an account has been misused.
      </p>

      <h2>Your data</h2>
      <p>
        Your records remain yours. You give us permission to store and process them to provide the service, as described in our <a href="/privacy">privacy policy</a>. You confirm that you have the right to enter the information you add, including information about your crew, and that you will use clock-in features, including GPS and photos, in line with the law and your own policies.
      </p>

      <h2>Acceptable use</h2>
      <p>Do not misuse the service: no unlawful use, no attempts to break into the service or other customers' data, no overloading it, and no reselling it without our written agreement.</p>

      <h2>Term, fees and plans</h2>
      <p>
        The service is provided for an <b>agreed term, on a one-year basis</b>, set out in the agreement between you and us. Plans, prices and what is included are agreed with you directly before you start, and they apply for that term. We will not change the agreed price during the term. What happens at the end of the term, including any renewal, is as set out in your agreement.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep the service available and your data safe, but we do not promise it will always be uninterrupted or error free. Back up anything you cannot afford to lose, and use the export features.
      </p>

      <h2>Limits of liability</h2>
      <p>
        To the extent the law allows, the service is provided "as is", and we are not liable for indirect or consequential losses, lost profits or lost business. Our total liability for any claim is limited to the fees you paid us in the 12 months before the claim.
      </p>

      <h2>Ending the service</h2>
      <p>
        Your agreed term runs for its full length unless your agreement says otherwise. You can stop using the service at any time, but fees for the agreed term remain payable unless your agreement says otherwise. We may suspend or end access for serious or repeated breaches of these terms. At the end of the term, or on request, we will help you export your records.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of Ontario and the federal laws of Canada that apply there.</p>

      <h2>Changes</h2>
      <p>We may update these terms. If a change is meaningful, we will update the date above and tell customers before it applies. A change does not alter the price or length of a term you have already agreed.</p>
    </LegalLayout>
  );
}
