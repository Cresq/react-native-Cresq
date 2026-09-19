/**
 * Legal texts shown in the app. Drafts written for a Dutch company serving
 * users in the Netherlands and the EU. Every document must be reviewed by a
 * lawyer and translated to Dutch before launch; the app shows the draft
 * notice until `reviewed` is true. Keep these plain: short sentences, no
 * jargon, nothing promised that the app does not do.
 */
export type LegalDoc = { key: string; title: string; updated: string; reviewed: boolean; sections: { h: string; p: string[] }[] };

const COMPANY = "CresQ (Nick Li)";
const CONTACT = "privacy@cresq.nl";

export const legalDocs: LegalDoc[] = [
  {
    key: "privacy",
    title: "Privacy Policy",
    updated: "19 September 2026",
    reviewed: false,
    sections: [
      { h: "Who we are", p: [`${COMPANY}, established in the Netherlands, is responsible for your personal data in the CresQ app. Questions and requests: ${CONTACT}.`] },
      { h: "What we collect, and why", p: ["Account: your name, email address and password (stored hashed). Needed to give you an account and sign you in.", "Profile: training goal, experience, days per week, limitations, and your year of birth. Your year of birth is used once to check that you are 16 or older. We never ask for your full date of birth.", "Training log: the workouts you plan, the sets, weights and reps you log, and notes you add. This is the product; without it the app does nothing.", "Health data, only if you connect a watch or health app: heart rate, energy and similar readings. This is a special category of personal data. We only read it after you explicitly turn each permission on, and you can turn it off at any time in Settings › Connected devices.", "Photos you add to a session. Only the photos you choose; we do not scan your library.", "Social: who you follow, and what you choose to share to the feed. Anything not shared stays private.", "Anonymous usage statistics and age bands: only if you switch them on in Account and privacy. They are off by default. Age is only ever reported as a band such as 25 to 34, never as a year.", "Technical: crash reports without personal data may be collected to keep the app working. No advertising identifiers, no cross-app tracking."] },
      { h: "Legal basis", p: ["Account, profile and training log: performance of the contract you enter by creating an account (GDPR article 6(1)(b)).", "Health data: your explicit consent (GDPR article 9(2)(a)), given per permission.", "Usage statistics, age statistics and product emails: your consent (article 6(1)(a)), which you can withdraw at any time.", "Security and abuse prevention: our legitimate interest in keeping the service safe (article 6(1)(f))."] },
      { h: "Where your data lives", p: ["Your log, your profile, your photos and what you eat are stored on your device only. When account sync launches, they will be stored on servers in the European Union. We will update this policy before that happens and ask you again where consent is required.", "Three things leave your device today, none of them with your name, your account or an identifier. A product whose figures you checked against its pack is shared, so the next person who scans that barcode gets them. A busyness report you choose to send for your gym is shared: the gym's name, the level you picked and the time. And when you ask CresQ to read a nutrition table, that one photo is sent to be read, and we do not keep it.", "If you connect Apple Health, CresQ reads your workouts and the active energy in them, on your phone, to count what you burned. That data stays on your device, is never used for advertising and is never shared."] },
      { h: "Who we share it with", p: ["Nobody, for money, ever. We do not sell data and we do not use it for advertising.", "Processors that help us run the service: Supabase (database and functions, European Union, Ireland) holds the shared products and the busyness reports; Anthropic (United States) reads the photo of a nutrition table when you ask for that, and does not use it to train its models. Komoot (Photon, Germany) receives the words you type when you search for your gym, and nothing else. Any other processor will be listed here with its location before we start using it.", "Other users see what you share to the feed and your public profile. A private account hides your workouts from people you have not accepted."] },
      { h: "How long we keep it", p: ["As long as you have an account. Delete your account in Account and privacy and everything is removed from your device, and from our servers within 30 days once sync exists. Backups are overwritten within 90 days."] },
      { h: "Your rights", p: ["You can see, correct, download and delete your data in the app, without asking us. You can also object to processing, restrict it, or withdraw consent at any time.", `Anything you cannot do in the app: email ${CONTACT}. We answer within one month.`, "You can complain to the Dutch data protection authority, the Autoriteit Persoonsgegevens, at autoriteitpersoonsgegevens.nl."] },
      { h: "Children", p: ["CresQ is for people aged 16 and over. We ask your year of birth at sign-up and do not create accounts for anyone younger. If you believe a younger person has an account, tell us and we will remove it."] },
      { h: "Changes", p: ["When this policy changes in a way that matters, we tell you in the app before it takes effect. The date at the top is always the current version."] },
    ],
  },
  {
    key: "terms",
    title: "Terms of Use",
    updated: "13 September 2026",
    reviewed: false,
    sections: [
      { h: "The service", p: [`CresQ is a training log and progress app provided by ${COMPANY}. These terms apply to the app and the account you create in it. By creating an account you accept them.`] },
      { h: "Not medical advice", p: ["CresQ helps you plan and record training. It does not diagnose, treat or prevent anything, and its estimates and forecasts are calculations, not advice. Train within your ability, and talk to a doctor before you start or change a programme if you have a condition, an injury, or are unsure."] },
      { h: "Your account", p: ["You must be 16 or older. Keep your password to yourself. You are responsible for what happens under your account.", "You can delete your account at any time in Account and privacy."] },
      { h: "Your content", p: ["What you log, write and photograph is yours. By sharing something to the feed you give us permission to show it to the people you shared it with, for as long as it is shared. Unshare it or delete it and that permission ends.", "Do not post what is not yours to post, and nothing unlawful, hateful or harassing. We may remove content and close accounts that break this."] },
      { h: "Our content", p: ["The app, its design, its name and its logo belong to us. You may use them only through the app. Third-party components are listed under Licences."] },
      { h: "Availability and changes", p: ["We work to keep CresQ available and may change or stop features. Where a change removes something you rely on, we tell you in advance where we reasonably can."] },
      { h: "Liability", p: ["We are liable for damage caused by our intent or gross negligence. Beyond that, and as far as Dutch law allows, we are not liable for indirect damage or for training outcomes. Nothing in these terms limits rights you have as a consumer under Dutch or EU law."] },
      { h: "Paid features", p: ["CresQ is free today. If paid features arrive, their price and terms will be shown before you pay, and the Refund policy applies."] },
      { h: "Law and disputes", p: ["Dutch law applies. Disputes go to the competent court in the Netherlands. As a consumer you can also use the EU online dispute resolution platform at ec.europa.eu/odr."] },
    ],
  },
  {
    key: "cookies",
    title: "Cookies and local storage",
    updated: "13 September 2026",
    reviewed: false,
    sections: [
      { h: "In the app", p: ["The app stores your log, settings and sign-in state on your device so it works offline and remembers you. This storage is strictly necessary for the service and is not used to track you."] },
      { h: "On the web version", p: ["The web version uses browser local storage for the same purpose: to keep your log and sign-in on your device. It sets no cookies. Under the Dutch Telecommunications Act (article 11.7a) this strictly necessary storage does not require consent, which is why you see no cookie banner."] },
      { h: "No tracking", p: ["We use no advertising cookies, no third-party analytics cookies and no social media pixels. If we ever add an analytics tool, it will be off until you turn it on in Account and privacy, and this page will list it."] },
      { h: "Third-party content", p: ["The app embeds no third-party content (no videos, maps or social widgets). If that changes, the embed will not load until you allow it."] },
    ],
  },
  {
    key: "refunds",
    title: "Refund policy",
    updated: "13 September 2026",
    reviewed: false,
    sections: [
      { h: "Today", p: ["CresQ is free. There is nothing to refund."] },
      { h: "When paid features arrive", p: ["Purchases made through the Apple App Store or Google Play are handled by those stores, including refunds. Ask them first: Apple at reportaproblem.apple.com, Google through the Play Store order history.", "As an EU consumer you have a 14-day right of withdrawal on digital purchases. When you start using a paid feature immediately, we ask you to confirm that you understand the withdrawal right then ends for that purchase, as the law allows.", `If something went wrong on our side, email ${CONTACT} with your receipt and we will sort it out.`] },
    ],
  },
  {
    key: "licences",
    title: "Licences and credits",
    updated: "13 September 2026",
    reviewed: true,
    sections: [
      { h: "Icons", p: ["coolicons by Kryston Schwarze, licensed under CC BY 4.0 (creativecommons.org/licenses/by/4.0). A few icons (dumbbell, trophy, pulse, flame, watch) were drawn by us in the same style."] },
      { h: "Typefaces", p: ["Inter by Rasmus Andersson, under the SIL Open Font License 1.1."] },
      { h: "Software", p: ["Built with Expo, React Native and open-source packages under the MIT and similar licences. A full list ships with the source."] },
      { h: "Trademarks", p: ["Apple, the Apple logo, Google and the Google logo are trademarks of their owners and appear only on the sign-in buttons, as their guidelines allow. Garmin, Fitbit, Whoop, Oura and Strava are trademarks of their owners; CresQ is not affiliated with them."] },
      { h: "Photos", p: ["All photos in the app are our own or were added by the person whose profile shows them."] },
    ],
  },
];

export const legalDoc = (key: string) => legalDocs.find((d) => d.key === key);
