import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | RepVisual",
  description: "How RepVisual handles account information, Google sign-in, training records and browser storage.",
  robots: { index: true, follow: true },
};

export default function PrivacyPolicyPage() {
  const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || "shubhshah453@gmail.com";
  return <article className="page-shell py-10 sm:py-14">
    <div className="mx-auto max-w-3xl space-y-8 text-sm leading-7 text-white/70">
      <header className="space-y-3 border-b border-white/10 pb-6">
        <p className="font-semibold text-accent">RepVisual</p>
        <h1 className="page-title text-white">Privacy Policy</h1>
        <p>Effective date: November 11, 2026</p>
        <p>RepVisual is an exercise browser and personal training planner. This policy explains how the app accesses, uses, stores and shares information when you browse exercises, sign in or save training records.</p>
      </header>
      <section className="space-y-3" aria-labelledby="privacy-information">
        <h2 id="privacy-information" className="text-xl font-semibold text-white">Information we handle</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Account information:</strong> when you register or sign in, Supabase Auth handles your account identifier, email address and authentication session. Email/password credentials are handled by Supabase Auth.</li>
          <li><strong>Google account information:</strong> if you choose Google sign-in, Google and Supabase Auth provide basic profile information, such as your Google account identifier, name, email address and profile picture if supplied. RepVisual uses this information to establish your account and associate it with your private training records. RepVisual does not request access to Gmail, Google Drive, Google Calendar or Google Contacts.</li>
          <li><strong>Training records:</strong> workouts, saved exercises, favourites, exercise notes, weekly schedules, completion ticks, progress and workout history that you enter or generate through the app.</li>
          <li><strong>Technical information:</strong> hosting and authentication providers may process IP addresses, request timestamps, browser information and diagnostic logs to deliver and protect the service.</li>
        </ul>
      </section>
      <section className="space-y-3" aria-labelledby="privacy-use">
        <h2 id="privacy-use" className="text-xl font-semibold text-white">How information is used</h2>
        <p>Information is used to sign you in, keep each account’s training records separate, save and restore your records across devices, show your workout history and progress, and maintain the app. Google account information is used for authentication and account identification. We do not sell your personal information or use Google account information for targeted advertising.</p>
      </section>
      <section className="space-y-3" aria-labelledby="privacy-storage">
        <h2 id="privacy-storage" className="text-xl font-semibold text-white">Browser storage and cloud sync</h2>
        <p>Without signing in, training records are stored in your browser’s local storage. When you sign in and account sync is available, training records are saved to Supabase under your account. The app also retains a device cache so changes can be kept while a connection is unavailable.</p>
        <p>The first account you sign in to on a browser can import that browser’s existing training records. The original browser copy is retained as a migration backup. Later accounts on that browser use separate caches. Signing out does not erase device caches or the migration backup; clear the site’s browser data to remove those local copies.</p>
        <p>Authentication uses stored session credentials so you can remain signed in. Timer state and music playback are device-local. Third-party embeds may use their own cookies or storage.</p>
      </section>
      <section className="space-y-3" aria-labelledby="privacy-providers">
        <h2 id="privacy-providers" className="text-xl font-semibold text-white">Service providers and external content</h2>
        <p>Vercel hosts the website, Supabase provides authentication and account data storage, and Google processes Google sign-in. Requests to these services are subject to their privacy practices. Data may be processed in the regions used by these providers.</p>
        <p>Exercise images, YouTube videos and optional music players, including EchoPlay, are served by external providers. Loading or interacting with their content can send technical information to those providers. Their privacy policies apply to that content. Training records are not intentionally sent to the video or music players as part of playback.</p>
        <p>Shared custom exercises are a public catalog feature. Authorized publishing can make an exercise’s name, linked video and muscle targets publicly readable. Personal notes and workout history are separate from those public catalog records.</p>
      </section>
      <section className="space-y-3" aria-labelledby="privacy-control">
        <h2 id="privacy-control" className="text-xl font-semibold text-white">Your choices, retention and deletion</h2>
        <p>You can use the exercise browser without signing in, edit or remove saved items through the app, and export your current training records from the Account page. Removing a saved workout does not automatically remove previously recorded workout history. Account records are retained to provide your saved library unless removed through available controls or through a deletion request.</p>
        <p>To request access, correction or deletion of your account and cloud training records, contact the app developer as described below. Account deletion is not currently offered as a self-service button. Device backups must also be removed by clearing the site’s browser data. Service providers may retain operational backups and logs according to their own retention practices.</p>
        <p>You can revoke Google access through your <a href="https://myaccount.google.com/connections" className="text-accent underline">Google Account connections settings</a>. Revoking Google access does not by itself delete training records already saved to your RepVisual account.</p>
      </section>
      <section className="space-y-3" aria-labelledby="privacy-security">
        <h2 id="privacy-security" className="text-xl font-semibold text-white">Security</h2>
        <p>Account sync uses authenticated requests and database access rules intended to restrict personal training records to their owner. No online service or browser storage can be guaranteed completely secure. Avoid putting passwords, payment information or other unnecessary sensitive information in exercise notes, and take care when using a shared device.</p>
      </section>
      <section className="space-y-3" aria-labelledby="privacy-contact">
        <h2 id="privacy-contact" className="text-xl font-semibold text-white">Contact and policy updates</h2>
        <p>{contact ? <>For privacy questions or data requests, email <a className="break-all text-accent underline" href={`mailto:${contact}`}>{contact}</a>.</> : <>For privacy questions or data requests, contact the app developer using the user support email displayed on the RepVisual Google sign-in consent screen.</>} Do not send passwords or authentication tokens.</p>
        <p>This page may be updated as app features or service providers change. The effective date above identifies the current version.</p>
      </section>
      <Link href="/library" className="inline-flex min-h-11 items-center rounded-lg border border-white/20 px-4 font-semibold text-white">Back to RepVisual</Link>
    </div>
  </article>;
}
