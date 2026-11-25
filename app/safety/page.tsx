import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/InfoPage";

export const metadata: Metadata = { title: "Safety Tips · The CON" };

export default function SafetyPage() {
  return (
    <InfoPage title="Dating Safety Tips">
      <p className="lead-in">
        Most people are here for the same reason you are. These habits help keep first meetups fun and safe.
      </p>

      <h2>Before you meet</h2>
      <ul>
        <li>Get to know them in the app first. A trivia duel is a great start.</li>
        <li>Do a quick video call so you know they match their photos.</li>
        <li>Never send money, gift cards or crypto, no matter the story. Report anyone who asks.</li>
        <li>Keep personal details like your home address, workplace and financial info to yourself until you trust them.</li>
      </ul>

      <h2>When you meet</h2>
      <ul>
        <li>Meet somewhere public and busy: a café, a game store, or the main hall at a con.</li>
        <li>Tell a friend where you&rsquo;re going, who you&rsquo;re meeting, and when you&rsquo;ll check in.</li>
        <li>Get yourself there and back so you can leave whenever you want.</li>
        <li>At conventions, stick to public areas. Hotel rooms and room parties can wait.</li>
        <li>Keep an eye on your drink and stay in control.</li>
      </ul>

      <h2>Trust your gut</h2>
      <p>
        If something feels off, it&rsquo;s okay to leave. You don&rsquo;t owe anyone an explanation. Afterwards, use{" "}
        <strong>Block or report</strong> on their profile so our moderators can take a look.
      </p>

      <h2>If you&rsquo;re in danger</h2>
      <p>Call your local emergency number (911 in the US) right away.</p>

      <p>
        See also our <Link href="/conduct">Code of Conduct</Link>.
      </p>
    </InfoPage>
  );
}
