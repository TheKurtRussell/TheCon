import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";
import { CONTACT_EMAIL, POLICIES_UPDATED } from "@/lib/site";

export const metadata: Metadata = { title: "Code of Conduct · The CON" };

export default function ConductPage() {
  return (
    <InfoPage title="Code of Conduct" updated={POLICIES_UPDATED}>
      <p className="lead-in">
        The CON is a safe space for geeks of every kind. Everyone who joins agrees to these rules. Think of them as the
        con floor rules: be kind, respect people&rsquo;s space, and keep it fun for everyone.
      </p>

      <h2>1. Adults only</h2>
      <p>You must be 18 or older. If you think someone might be under 18, report them right away.</p>

      <h2>2. Be the real you</h2>
      <p>
        Use your own photos and honest details. Cosplay photos are welcome, but include at least one photo where people
        can see what you actually look like. No pretending to be someone else, and no fake accounts.
      </p>

      <h2>3. Consent is not optional</h2>
      <p>
        &ldquo;No&rdquo; and silence both mean no. Don&rsquo;t send sexual messages or images to anyone who hasn&rsquo;t clearly
        asked for them. Don&rsquo;t pressure people to meet up, share their number or move to another app.
      </p>

      <h2>4. No gatekeeping, no hate</h2>
      <p>
        Nobody has to prove they&rsquo;re a &ldquo;real fan.&rdquo; We don&rsquo;t allow harassment, threats, slurs, or abuse
        based on race, ethnicity, religion, gender, gender identity, sexual orientation, disability, body type, age or
        fandom. Respect people&rsquo;s names and pronouns.
      </p>

      <h2>5. Keep it safe</h2>
      <p>
        Never ask anyone for money, gift cards or financial details. No spam, scams, selling, or recruiting. Don&rsquo;t
        share someone else&rsquo;s private information or screenshots of their profile or messages without permission.
      </p>

      <h2>6. Photos</h2>
      <p>No nudity, sexual content, violence or gore in photos. No photos of other people without their permission.</p>

      <h2>What happens if someone breaks the rules</h2>
      <p>
        Our moderators review every report. Depending on what happened, we may warn the member, remove content, suspend
        the account, or ban it permanently. If someone is in danger, we may contact the authorities.
      </p>

      <h2>How to report</h2>
      <p>
        Open the person&rsquo;s profile and choose <strong>Block or report</strong>. Reports are confidential: the person
        won&rsquo;t know who reported them. You can also email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        See our <Link href="/safety">safety tips</Link> for advice on meeting up.
      </p>
    </InfoPage>
  );
}
