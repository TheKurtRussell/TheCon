import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { CONTACT_EMAIL, POLICIES_UPDATED } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of Service · The CON" };

export default function TermsPage() {
  return (
    <InfoPage title="Terms of Service" updated={POLICIES_UPDATED} draft>
      <p className="lead-in">
        These terms are the agreement between you and The CON when you use the app. By creating an account, you agree to
        them.
      </p>

      <h2>1. Who can join</h2>
      <p>
        You must be at least 18, able to agree to these terms, and not barred from using dating services. One account per
        person.
      </p>

      <h2>2. Your account</h2>
      <p>
        Keep your login details safe and tell us if you think someone else has used your account. You&rsquo;re responsible
        for what happens on your account.
      </p>

      <h2>3. How you must behave</h2>
      <p>
        Follow our <Link href="/conduct">Code of Conduct</Link>. Don&rsquo;t use The CON for anything illegal, harmful,
        fraudulent or commercial, and don&rsquo;t try to break, scrape or misuse the service.
      </p>

      <h2>4. Your content</h2>
      <p>
        You own the photos and text you post. You give The CON permission to store and display them inside the app so the
        service works. That permission ends when you delete the content or your account. Only post content you have the
        right to share.
      </p>

      <h2>5. Moderation</h2>
      <p>
        We may remove content, or suspend or close accounts, that break these terms or the Code of Conduct, or that put
        others at risk.
      </p>

      <h2>6. Meeting people</h2>
      <p>
        We don&rsquo;t run criminal background checks, and we can&rsquo;t guarantee who anyone is or how they&rsquo;ll act.
        You&rsquo;re responsible for your own interactions, both in the app and in person. Please read our{" "}
        <Link href="/safety">safety tips</Link>.
      </p>

      <h2>7. The service</h2>
      <p>
        The CON is provided &ldquo;as is.&rdquo; We work hard to keep it running and secure, but we can&rsquo;t promise it
        will always be available or error-free. We may change or end features at any time.
      </p>

      <h2>8. Limits on liability</h2>
      <p>
        To the extent the law allows, The CON isn&rsquo;t liable for indirect or consequential losses, or for how other
        members behave.
      </p>

      <h2>9. Leaving</h2>
      <p>You can delete your account at any time from Edit profile.</p>

      <h2>10. Changes</h2>
      <p>We may update these terms. If the changes are important, we&rsquo;ll tell members before they take effect.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </InfoPage>
  );
}
