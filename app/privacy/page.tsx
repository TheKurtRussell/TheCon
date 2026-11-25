import type { Metadata } from "next";
import InfoPage from "@/components/InfoPage";
import { CONTACT_EMAIL, POLICIES_UPDATED } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy Policy · The CON" };

export default function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy" updated={POLICIES_UPDATED} draft>
      <p className="lead-in">
        This policy explains what The CON collects, why, who can see it, and how to delete it. The short version: we
        only collect what the app needs, we never sell your data, and you can delete your account at any time.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your email address, password (stored encrypted by our login provider), and birthdate.</li>
        <li><strong>Profile:</strong> your badge name, pronouns, gender identity, city, bio, fandoms, About Me answers, badge theme and photos.</li>
        <li><strong>Matching preferences:</strong> who you want to see, which groups you appear in, and your age range.</li>
        <li><strong>Activity:</strong> likes and passes, matches, trivia duel answers, blocks and reports.</li>
        <li><strong>Technical data:</strong> basic logs our hosting providers keep, like IP address and browser type, to run and protect the service.</li>
      </ul>

      <h2>Who can see what</h2>
      <ul>
        <li><strong>Other members</strong> can see your profile, age (never your birthdate) and photos. They can&rsquo;t see your email, birthdate, matching preferences, likes or passes.</li>
        <li><strong>Your matches</strong> can see your full profile and your trivia duel results with them.</li>
        <li><strong>Blocked members</strong> can&rsquo;t see you at all, and you can&rsquo;t see them.</li>
        <li><strong>Logged-out visitors</strong> can&rsquo;t see any member information.</li>
        <li><strong>Our moderators</strong> can see reports and the profiles involved, to keep the community safe.</li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To run the app: show your profile, suggest matches, run icebreaker games, keep accounts secure, enforce our Code
        of Conduct, and respond to reports. We don&rsquo;t sell your personal information, and we don&rsquo;t use it for
        third-party advertising.
      </p>

      <h2>Services we use</h2>
      <p>
        We store data with Supabase (database, login and photo storage) and host the app on Vercel. They process data on
        our behalf. If we add ID verification, a verification provider will check your ID and tell us only whether
        you&rsquo;re verified. We won&rsquo;t store copies of your ID.
      </p>

      <h2>Keeping and deleting your data</h2>
      <p>
        We keep your data while your account is open. You can delete your account any time from{" "}
        <strong>Edit profile &gt; Delete my account</strong>. This permanently removes your profile, photos, likes,
        matches and duels. Our hosting providers may keep backups for a limited time before they are overwritten.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        You can view and edit your profile at any time. Depending on where you live, you may have rights to access,
        correct, download or delete your data. Email us to make a request.
      </p>

      <h2>Adults only</h2>
      <p>The CON is only for people 18 and older. We delete accounts we learn belong to anyone younger.</p>

      <h2>Changes</h2>
      <p>If we make important changes to this policy, we&rsquo;ll let members know in the app.</p>

      <h2>Contact</h2>
      <p>
        Questions or requests: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </InfoPage>
  );
}
