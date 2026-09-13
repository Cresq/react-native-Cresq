# CresQ legal and privacy audit

Date: 13 September 2026. Scope: the app as it is in this repository, before any server, payments or analytics exist. This is a working document for Nick and for the lawyer who reviews the drafts in `src/data/legal.ts`. It is not legal advice.

## 1. Which rules apply

| Rule | Why it applies | What it means for CresQ |
|---|---|---|
| GDPR (AVG) | Personal data of people in the EU | Lawful basis per purpose, data minimisation, rights, records of processing, breach notification within 72 hours |
| UAVG (Dutch implementation) | Dutch company, Dutch users | Age of digital consent is **16** (art. 5 UAVG). Under 16 needs a parent. The app blocks under-16s. |
| GDPR art. 9, health data | Heart rate, energy, sleep, body mass from watches and health apps are health data | **Explicit** consent per permission, revocable, logged. A DPIA is likely required once health data is processed at scale (AP list of mandatory DPIAs includes large-scale health data). |
| Telecommunicatiewet art. 11.7a | Storage on the user's device (cookies, local storage) | Strictly necessary storage needs no consent but must be explained. Analytics or tracking storage needs consent first. |
| Dutch Civil Code (BW) consumer rules, EU Consumer Rights Directive | Users are consumers | Clear terms before purchase, 14-day withdrawal right on digital content with the standard exception once use starts with consent, no unfair terms |
| App Store Review Guidelines 5.1.1(v) and Google Play User Data policy | Distribution | In-app account deletion, privacy labels or data safety form must match this audit, health data may not be used for advertising |
| Auteurswet, trademark law | Icons, fonts, logos, photos, brand names | Attribution for CC BY, OFL for fonts, brand guidelines for Apple and Google sign-in, no confusingly similar trade dress |

Supervisor: Autoriteit Persoonsgegevens (AP). Register a processing record before launch; it is mandatory for health data regardless of company size.

## 2. Checklist against the request

| Item | Status | Where |
|---|---|---|
| Collect no data before acceptance | Done | Sign-up requires two ticks (16+, Terms and Privacy). Timestamps stored in `db.consent`. Nothing is sent anywhere; there is no server yet. |
| Privacy policy page | Draft | `/legal/privacy`, linked from sign-up, onboarding, Settings, Account and privacy |
| Cookies policy | Draft | `/legal/cookies`. Explains local storage as strictly necessary, no tracking, no embeds |
| Form consent | Done | Checkboxes are unticked by default, separate from each other, with clear labels. Consent for analytics and age bands is a separate opt-in later, never bundled with the terms. |
| Cookie consent check | Not needed today | Only strictly necessary local storage exists. Add a consent step before any analytics or third-party storage. |
| Only necessary data | Done | Year of birth instead of date of birth; age reported as bands; city can be hidden; no phone number, no gender, no weight at sign-up |
| Dutch regulations | See section 1 | |
| Terms and conditions page | Draft | `/legal/terms`, includes the no-medical-advice clause a training app needs |
| Refund policy | Draft | `/legal/refunds`, points to App Store and Play, and to the EU withdrawal right |
| Analytics tracking check | Clean | No analytics, crash or advertising SDK in `package.json`. `src/analytics.ts` is the only door and is gated on consent. |
| Clear button labels | Reviewed | Destructive actions say what they do: "Delete account permanently", "Remove 33 sessions", "Reset app". Follow buttons read "Follow" and "Following". Sign-up says "Create account". |
| Copyright on images | Clean, with two notes | Nick's own photos and logos. coolicons under CC BY 4.0 with attribution in Settings and Licences. Fonts under OFL. Mock people are invented names; their avatars reuse Nick's photos and must be replaced or removed before release. |
| Third-party embeds | None | No web views, maps, videos or social widgets. Cookie policy commits to a consent gate before any are added. |

## 3. Age data

Collecting age is allowed with a lawful basis and a stated purpose. CresQ collects **year of birth** for two purposes:

1. The 16+ check at onboarding (contract, and the UAVG age rule). Required.
2. Age statistics as bands (16 to 24, 25 to 34, and so on) to understand the audience. Optional, consent-based, off by default, and only meaningful once analytics exist. Implemented in `ageBand()` in `src/analytics.ts`.

Do not collect the full date of birth; it is not needed for either purpose and would be a data-minimisation finding.

## 4. Design and trade-dress review

Generic patterns (bottom tab bar, segmented control, photo grid, list rows with chevrons, a line chart) are not protectable and are used by every app. Points checked:

- **Colour.** The Ember orange on a dark ground is our own combination. Strava also uses orange, on a light ground with a different typeface and layout; no confusion. Avoid adopting Strava-specific vocabulary ("kudos", "segments").
- **Workouts grid.** A three-column grid of squares is a general convention (Instagram, Apple Photos, many others). Our tiles show workout initials and a trophy, which is distinctive to CresQ.
- **Logging screen.** Set rows with previous, kg, reps and a check are the standard for strength logs (Strong, Hevy, Fitbod). Our set-type sheet, rest handling and summary copy are our own.
- **Names.** "PR", "1RM", "split", "superset" are generic training terms. "CresQ" and the mark are Nick's; consider a Benelux trademark filing (BOIP) before launch.
- **Icons and fonts.** Licensed, see Licences. No icons copied from other apps.
- **Apple and Google sign-in.** Their logos may only appear on real sign-in buttons that follow their guidelines. If Google sign-in ships on iOS, Sign in with Apple must be offered too (App Store guideline 4.8).

## 5. Before launch, in order

1. Lawyer review of the four drafts, then Dutch translations; flip `reviewed` in `src/data/legal.ts`.
2. Replace mock people and their avatars with nothing, or with clearly fictional placeholders that do not reuse Nick's photos.
3. Processing record (verwerkingsregister) and a short DPIA once health data is enabled.
4. Choose EU hosting (Supabase EU region) and a data-processing agreement with each processor; list them in the privacy policy.
5. App Store privacy labels and Play data safety form filled from section 2, not from memory.
6. Add a consent gate in code before enabling any analytics provider: `track()` already refuses without consent.
7. Sign in with Apple alongside Google on iOS, or drop Google.
8. Contact address: `privacy@cresq.nl` must exist and be read.
