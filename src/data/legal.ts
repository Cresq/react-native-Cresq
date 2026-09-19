import type { Language } from "@/i18n/translate";

/**
 * Legal texts shown in the app, in the reader's language: Dutch first, since
 * that is who CresQ is for, and English beside it. Drafts written for a Dutch
 * company serving users in the Netherlands and the EU. Every document must be
 * reviewed by a lawyer before launch; the app shows the draft notice until
 * `reviewed` is true. Keep these plain: short sentences, no jargon, nothing
 * promised that the app does not do. The two languages say the same thing:
 * change one and the other changes with it.
 */
export type LegalDoc = { key: string; title: string; updated: string; reviewed: boolean; sections: { h: string; p: string[] }[] };

const COMPANY = "CresQ (Nick Li)";
const CONTACT = "privacy@cresq.nl";

const en: LegalDoc[] = [
  {
    key: "privacy",
    title: "Privacy Policy",
    updated: "19 September 2026",
    reviewed: false,
    sections: [
      { h: "Who we are", p: [`${COMPANY}, established in the Netherlands, is responsible for your personal data in the CresQ app. Questions and requests: ${CONTACT}.`] },
      {
        h: "What we collect, and why",
        p: [
          "Account: your name and email address, kept on your device. The password you choose is not stored anywhere today, because there is no server yet to check it against. That changes when account sync arrives, and this policy will be updated before it does.",
          "Profile: training goal, experience, days per week, limitations, and your year of birth. Your year of birth is used once to check that you are 16 or older. We never ask for your full date of birth.",
          "Training log: the workouts you plan, the sets, weights and reps you log, and notes you add. This is the product; without it the app does nothing.",
          "Food and body: what you eat, your targets, your weight, and the height, sex and activity level you give to work those targets out.",
          "Health data, only if you connect a watch or health app: heart rate, energy and similar readings. This is a special category of personal data. We only read it after you explicitly turn each permission on, and you can turn it off at any time in Settings, Connected devices.",
          "Photos you add to a session or a product. Only the photos you choose; we do not scan your library.",
          "Social: who you follow, and what you choose to share to the feed. Anything not shared stays private.",
          "Anonymous usage statistics and age bands: only if you switch them on in Account and privacy. They are off by default. Age is only ever reported as a band such as 25 to 34, never as a year.",
          "Technical: crash reports without personal data may be collected to keep the app working. No advertising identifiers, no cross-app tracking.",
        ],
      },
      {
        h: "Legal basis",
        p: [
          "Account, profile, training log and food log: performance of the contract you enter by creating an account (GDPR article 6(1)(b)).",
          "Health data: your explicit consent (GDPR article 9(2)(a)), given per permission.",
          "Usage statistics, age statistics and product emails: your consent (article 6(1)(a)), which you can withdraw at any time.",
          "Security and abuse prevention: our legitimate interest in keeping the service safe (article 6(1)(f)).",
        ],
      },
      {
        h: "Where your data lives",
        p: [
          "Your log, your profile, your photos, your weight and what you eat are stored on your device only. When account sync launches, they will be stored on servers in the European Union. We will update this policy before that happens and ask you again where consent is required.",
          "A few things leave your device today, none of them with your name, your account or an identifier. The barcode you scan is looked up in our shared product list and in Open Food Facts. The words you type to find your gym are sent to a place search, and the gym you chose is used to ask how busy it is. A product whose figures you checked against its pack is shared, so the next person who scans that barcode gets them. A busyness report you choose to send for your gym is shared: the gym, the level you picked and the time. And when you ask CresQ to read a nutrition table, that one photo is sent to be read, and we do not keep it.",
          "Like every request over the internet, these carry your IP address, which the receiving service may log for a short time for security. We do not link it to you or to anything in your log.",
          "If you connect Apple Health, CresQ reads your workouts and the active energy in them, on your phone, to count what you burned. That data stays on your device, is never used for advertising and is never shared.",
        ],
      },
      {
        h: "Who we share it with",
        p: [
          "Nobody, for money, ever. We do not sell data and we do not use it for advertising.",
          "Services that receive something from the app: Supabase (database and functions, European Union, Ireland) holds the shared products and the busyness reports. Anthropic (United States) reads the photo of a nutrition table when you ask for that, and does not use it to train its models. Open Food Facts (France) receives the barcode you scan. Komoot (Photon, Germany) receives the words you type when you search for your gym, and nothing else. Any other service will be listed here with its location before we start using it.",
          "Other users see what you share to the feed and your public profile. A private account hides your workouts from people you have not accepted.",
        ],
      },
      { h: "How long we keep it", p: ["As long as you have an account. Delete your account in Account and privacy and everything is removed from your device, and from our servers within 30 days once sync exists. Backups are overwritten within 90 days. Shared products and busyness reports carry nothing that points to you, so they stay."] },
      {
        h: "Your rights",
        p: [
          "You can see, correct, download and delete your data in the app, without asking us. You can also object to processing, restrict it, or withdraw consent at any time.",
          `Anything you cannot do in the app: email ${CONTACT}. We answer within one month.`,
          "You can complain to the Dutch data protection authority, the Autoriteit Persoonsgegevens, at autoriteitpersoonsgegevens.nl.",
        ],
      },
      { h: "Children", p: ["CresQ is for people aged 16 and over. We ask your year of birth at sign-up and do not create accounts for anyone younger. If you believe a younger person has an account, tell us and we will remove it."] },
      { h: "Changes", p: ["When this policy changes in a way that matters, we tell you in the app before it takes effect. The date at the top is always the current version."] },
    ],
  },
  {
    key: "terms",
    title: "Terms of Use",
    updated: "19 September 2026",
    reviewed: false,
    sections: [
      { h: "The service", p: [`CresQ is a training, food and progress app provided by ${COMPANY}. These terms apply to the app and the account you create in it. By creating an account you accept them.`] },
      { h: "Not medical advice", p: ["CresQ helps you plan and record training and food. It does not diagnose, treat or prevent anything, and its estimates, targets and forecasts are calculations, not advice. Train and eat within what suits you, and talk to a doctor or dietitian before you start or change a programme or a diet if you have a condition, an injury, or are unsure."] },
      { h: "Figures about food", p: ["Product figures come from the pack, from Open Food Facts, from other users or from a reading of a photo. They can be wrong. Check them against the pack when it matters, especially for allergies: CresQ does not track allergens."] },
      { h: "Your account", p: ["You must be 16 or older. Keep your password to yourself. You are responsible for what happens under your account.", "You can delete your account at any time in Account and privacy."] },
      {
        h: "Your content",
        p: [
          "What you log, write and photograph is yours. By sharing something to the feed you give us permission to show it to the people you shared it with, for as long as it is shared. Unshare it or delete it and that permission ends.",
          "Do not post what is not yours to post, and nothing unlawful, hateful or harassing. We may remove content and close accounts that break this.",
        ],
      },
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
      {
        h: "When paid features arrive",
        p: [
          "Purchases made through the Apple App Store or Google Play are handled by those stores, including refunds. Ask them first: Apple at reportaproblem.apple.com, Google through the Play Store order history.",
          "As an EU consumer you have a 14-day right of withdrawal on digital purchases. When you start using a paid feature immediately, we ask you to confirm that you understand the withdrawal right then ends for that purchase, as the law allows.",
          `If something went wrong on our side, email ${CONTACT} with your receipt and we will sort it out.`,
        ],
      },
    ],
  },
  {
    key: "licences",
    title: "Licences and credits",
    updated: "19 September 2026",
    reviewed: true,
    sections: [
      { h: "Icons", p: ["coolicons by Kryston Schwarze, licensed under CC BY 4.0 (creativecommons.org/licenses/by/4.0). A few icons (dumbbell, trophy, pulse, flame, watch) were drawn by us in the same style."] },
      { h: "Typefaces", p: ["Inter by Rasmus Andersson, under the SIL Open Font License 1.1."] },
      { h: "Exercise illustrations", p: ["MoveKit, used under a commercial licence."] },
      { h: "Product data", p: ["Open Food Facts (openfoodfacts.org), made available under the Open Database License. Individual contents of the database are available under the Database Contents License."] },
      { h: "Gym locations", p: ["© OpenStreetMap contributors, under the Open Database License (openstreetmap.org/copyright), searched through Photon by Komoot."] },
      { h: "Software", p: ["Built with Expo, React Native and open-source packages under the MIT and similar licences. A full list ships with the source."] },
      { h: "Trademarks", p: ["Apple, the Apple logo, Google and the Google logo are trademarks of their owners and appear only on the sign-in buttons, as their guidelines allow. Garmin, Fitbit, Whoop, Oura, Strava and Basic-Fit are trademarks of their owners; CresQ is not affiliated with them."] },
      { h: "Photos", p: ["All photos in the app are our own or were added by the person whose profile shows them."] },
    ],
  },
];

const nl: LegalDoc[] = [
  {
    key: "privacy",
    title: "Privacybeleid",
    updated: "19 september 2026",
    reviewed: false,
    sections: [
      { h: "Wie wij zijn", p: [`${COMPANY}, gevestigd in Nederland, is verantwoordelijk voor je persoonsgegevens in de CresQ-app. Vragen en verzoeken: ${CONTACT}.`] },
      {
        h: "Wat we verzamelen, en waarom",
        p: [
          "Account: je naam en e-mailadres, bewaard op je toestel. Het wachtwoord dat je kiest wordt vandaag nergens opgeslagen, omdat er nog geen server is om het mee te controleren. Dat verandert zodra accounts gesynchroniseerd worden, en dit beleid wordt vóór die tijd bijgewerkt.",
          "Profiel: trainingsdoel, ervaring, dagen per week, beperkingen en je geboortejaar. Je geboortejaar gebruiken we één keer, om te controleren dat je 16 jaar of ouder bent. We vragen nooit je volledige geboortedatum.",
          "Trainingslog: de workouts die je plant, de sets, gewichten en herhalingen die je logt, en de notities die je toevoegt. Dit is het product; zonder dit doet de app niets.",
          "Voeding en lichaam: wat je eet, je doelen, je gewicht, en de lengte, het geslacht en het activiteitsniveau die je opgeeft om die doelen te berekenen.",
          "Gezondheidsgegevens, alleen als je een horloge of gezondheidsapp koppelt: hartslag, energie en vergelijkbare metingen. Dit is een bijzondere categorie persoonsgegevens. We lezen ze pas nadat je elke toestemming uitdrukkelijk zelf hebt aangezet, en je kunt ze op elk moment weer uitzetten bij Instellingen, Gekoppelde apparaten.",
          "Foto's die je toevoegt aan een sessie of een product. Alleen de foto's die je zelf kiest; we doorzoeken je bibliotheek niet.",
          "Sociaal: wie je volgt, en wat je zelf deelt op de feed. Alles wat je niet deelt, blijft privé.",
          "Anonieme gebruiksstatistieken en leeftijdsgroepen: alleen als je ze aanzet bij Account en privacy. Ze staan standaard uit. Leeftijd wordt alleen doorgegeven als groep, zoals 25 tot 34, nooit als jaartal.",
          "Technisch: crashrapporten zonder persoonsgegevens kunnen worden verzameld om de app werkend te houden. Geen advertentie-ID's, geen tracking over apps heen.",
        ],
      },
      {
        h: "Grondslag",
        p: [
          "Account, profiel, trainingslog en voedingslog: uitvoering van de overeenkomst die je aangaat door een account te maken (AVG artikel 6 lid 1 onder b).",
          "Gezondheidsgegevens: je uitdrukkelijke toestemming (AVG artikel 9 lid 2 onder a), per toestemming gegeven.",
          "Gebruiksstatistieken, leeftijdsstatistieken en productmails: je toestemming (artikel 6 lid 1 onder a), die je op elk moment kunt intrekken.",
          "Beveiliging en het tegengaan van misbruik: ons gerechtvaardigd belang om de dienst veilig te houden (artikel 6 lid 1 onder f).",
        ],
      },
      {
        h: "Waar je gegevens staan",
        p: [
          "Je log, je profiel, je foto's, je gewicht en wat je eet staan alleen op je toestel. Zodra accounts gesynchroniseerd worden, komen ze op servers in de Europese Unie te staan. We werken dit beleid bij voordat dat gebeurt en vragen je opnieuw om toestemming waar dat nodig is.",
          "Een paar dingen verlaten vandaag je toestel, geen van alle met je naam, je account of een kenmerk dat naar jou leidt. De barcode die je scant wordt opgezocht in onze gedeelde productlijst en bij Open Food Facts. De woorden die je typt om je gym te vinden gaan naar een zoekdienst voor plaatsen, en de gym die je kiest wordt gebruikt om op te vragen hoe druk het er is. Een product waarvan je de waarden met de verpakking hebt gecontroleerd wordt gedeeld, zodat de volgende die die barcode scant ze meteen heeft. Een druktemelding die je zelf voor je gym verstuurt wordt gedeeld: de gym, het niveau dat je koos en het tijdstip. En als je CresQ een voedingstabel laat lezen, wordt die ene foto verstuurd om gelezen te worden, en bewaren wij hem niet.",
          "Zoals elk verzoek over het internet dragen deze je IP-adres, dat de ontvangende dienst korte tijd kan vastleggen voor de beveiliging. Wij koppelen het niet aan jou of aan iets uit je log.",
          "Als je Apple Gezondheid koppelt, leest CresQ je workouts en de actieve energie daarin, op je telefoon, om te tellen wat je hebt verbrand. Die gegevens blijven op je toestel, worden nooit gebruikt voor advertenties en worden nooit gedeeld.",
        ],
      },
      {
        h: "Met wie we delen",
        p: [
          "Met niemand, voor geld, nooit. We verkopen geen gegevens en gebruiken ze niet voor advertenties.",
          "Diensten die iets van de app ontvangen: Supabase (database en functies, Europese Unie, Ierland) bewaart de gedeelde producten en de druktemeldingen. Anthropic (Verenigde Staten) leest de foto van een voedingstabel als je daarom vraagt, en gebruikt die niet om zijn modellen te trainen. Open Food Facts (Frankrijk) ontvangt de barcode die je scant. Komoot (Photon, Duitsland) ontvangt de woorden die je typt als je je gym zoekt, en verder niets. Elke andere dienst komt hier te staan, met zijn locatie, voordat we hem gaan gebruiken.",
          "Andere gebruikers zien wat je deelt op de feed en je openbare profiel. Een privéaccount verbergt je workouts voor mensen die je niet hebt geaccepteerd.",
        ],
      },
      { h: "Hoe lang we het bewaren", p: ["Zolang je een account hebt. Verwijder je account bij Account en privacy en alles wordt van je toestel gewist, en binnen 30 dagen van onze servers zodra synchronisatie bestaat. Back-ups worden binnen 90 dagen overschreven. Gedeelde producten en druktemeldingen bevatten niets dat naar jou leidt, en blijven dus staan."] },
      {
        h: "Je rechten",
        p: [
          "Je kunt je gegevens in de app inzien, verbeteren, downloaden en verwijderen, zonder het ons te vragen. Je kunt ook bezwaar maken tegen de verwerking, die laten beperken, of je toestemming op elk moment intrekken.",
          `Alles wat niet in de app kan: mail ${CONTACT}. We antwoorden binnen een maand.`,
          "Je kunt een klacht indienen bij de Nederlandse toezichthouder, de Autoriteit Persoonsgegevens, via autoriteitpersoonsgegevens.nl.",
        ],
      },
      { h: "Kinderen", p: ["CresQ is voor mensen van 16 jaar en ouder. We vragen je geboortejaar bij het aanmelden en maken geen accounts voor wie jonger is. Denk je dat iemand die jonger is een account heeft, laat het ons weten en we verwijderen het."] },
      { h: "Wijzigingen", p: ["Als dit beleid verandert op een manier die ertoe doet, laten we je dat in de app weten voordat het ingaat. De datum bovenaan is altijd die van de huidige versie."] },
    ],
  },
  {
    key: "terms",
    title: "Gebruiksvoorwaarden",
    updated: "19 september 2026",
    reviewed: false,
    sections: [
      { h: "De dienst", p: [`CresQ is een app voor training, voeding en voortgang, aangeboden door ${COMPANY}. Deze voorwaarden gelden voor de app en voor het account dat je erin aanmaakt. Door een account te maken ga je ermee akkoord.`] },
      { h: "Geen medisch advies", p: ["CresQ helpt je training en voeding te plannen en vast te leggen. Het stelt geen diagnose, behandelt of voorkomt niets, en de schattingen, doelen en prognoses zijn berekeningen, geen advies. Train en eet op een manier die bij je past, en overleg met een arts of diëtist voordat je een schema of dieet begint of verandert als je een aandoening of blessure hebt, of als je twijfelt."] },
      { h: "Waarden van producten", p: ["Productwaarden komen van de verpakking, van Open Food Facts, van andere gebruikers of uit het lezen van een foto. Ze kunnen fout zijn. Controleer ze met de verpakking als het ertoe doet, zeker bij allergieën: CresQ houdt geen allergenen bij."] },
      { h: "Je account", p: ["Je moet 16 jaar of ouder zijn. Houd je wachtwoord voor jezelf. Je bent verantwoordelijk voor wat er onder je account gebeurt.", "Je kunt je account op elk moment verwijderen bij Account en privacy."] },
      {
        h: "Jouw inhoud",
        p: [
          "Wat je logt, schrijft en fotografeert is van jou. Door iets op de feed te delen geef je ons toestemming om het te tonen aan de mensen met wie je het deelt, zolang het gedeeld is. Maak je het privé of verwijder je het, dan eindigt die toestemming.",
          "Plaats niets waarover je niet mag beschikken, en niets dat onwettig, haatdragend of intimiderend is. We mogen inhoud verwijderen en accounts sluiten die dit overtreden.",
        ],
      },
      { h: "Onze inhoud", p: ["De app, het ontwerp, de naam en het logo zijn van ons. Je mag ze alleen via de app gebruiken. Onderdelen van derden staan onder Licenties."] },
      { h: "Beschikbaarheid en wijzigingen", p: ["We doen ons best om CresQ beschikbaar te houden en mogen functies veranderen of stoppen. Als een wijziging iets wegneemt waar je op rekent, laten we dat vooraf weten waar dat redelijkerwijs kan."] },
      { h: "Aansprakelijkheid", p: ["We zijn aansprakelijk voor schade door onze opzet of grove nalatigheid. Daarbuiten, en voor zover het Nederlandse recht dat toelaat, zijn we niet aansprakelijk voor indirecte schade of voor trainingsresultaten. Niets in deze voorwaarden beperkt de rechten die je als consument hebt onder Nederlands of Europees recht."] },
      { h: "Betaalde functies", p: ["CresQ is vandaag gratis. Als er betaalde functies komen, zie je de prijs en de voorwaarden voordat je betaalt, en geldt het Terugbetalingsbeleid."] },
      { h: "Recht en geschillen", p: ["Nederlands recht is van toepassing. Geschillen gaan naar de bevoegde rechter in Nederland. Als consument kun je ook het Europese platform voor onlinegeschillenbeslechting gebruiken, via ec.europa.eu/odr."] },
    ],
  },
  {
    key: "cookies",
    title: "Cookies en lokale opslag",
    updated: "13 september 2026",
    reviewed: false,
    sections: [
      { h: "In de app", p: ["De app bewaart je log, je instellingen en of je bent ingelogd op je toestel, zodat hij zonder verbinding werkt en je onthoudt. Deze opslag is strikt noodzakelijk voor de dienst en wordt niet gebruikt om je te volgen."] },
      { h: "In de webversie", p: ["De webversie gebruikt de lokale opslag van je browser voor hetzelfde doel: je log en je inlog op je toestel bewaren. Er worden geen cookies geplaatst. Volgens de Telecommunicatiewet (artikel 11.7a) is voor deze strikt noodzakelijke opslag geen toestemming nodig; daarom zie je geen cookiebanner."] },
      { h: "Geen tracking", p: ["We gebruiken geen advertentiecookies, geen analytische cookies van derden en geen pixels van sociale media. Mochten we ooit een analysehulpmiddel toevoegen, dan staat het uit totdat jij het aanzet bij Account en privacy, en komt het op deze pagina te staan."] },
      { h: "Inhoud van derden", p: ["De app laadt geen inhoud van derden in (geen video's, kaarten of widgets van sociale media). Als dat verandert, wordt die inhoud pas geladen nadat jij het toestaat."] },
    ],
  },
  {
    key: "refunds",
    title: "Terugbetalingsbeleid",
    updated: "13 september 2026",
    reviewed: false,
    sections: [
      { h: "Vandaag", p: ["CresQ is gratis. Er valt niets terug te betalen."] },
      {
        h: "Als er betaalde functies komen",
        p: [
          "Aankopen via de Apple App Store of Google Play worden door die winkels afgehandeld, ook terugbetalingen. Vraag het eerst daar: Apple via reportaproblem.apple.com, Google via de bestelgeschiedenis in de Play Store.",
          "Als consument in de EU heb je 14 dagen bedenktijd bij digitale aankopen. Begin je een betaalde functie meteen te gebruiken, dan vragen we je te bevestigen dat je begrijpt dat de bedenktijd voor die aankoop daarmee eindigt, zoals de wet toestaat.",
          `Ging er aan onze kant iets mis, mail dan ${CONTACT} met je aankoopbewijs en we lossen het op.`,
        ],
      },
    ],
  },
  {
    key: "licences",
    title: "Licenties en vermeldingen",
    updated: "19 september 2026",
    reviewed: true,
    sections: [
      { h: "Iconen", p: ["coolicons van Kryston Schwarze, onder de licentie CC BY 4.0 (creativecommons.org/licenses/by/4.0). Enkele iconen (halter, beker, hartslag, vlam, horloge) hebben we zelf in dezelfde stijl getekend."] },
      { h: "Lettertypen", p: ["Inter van Rasmus Andersson, onder de SIL Open Font License 1.1."] },
      { h: "Oefenillustraties", p: ["MoveKit, gebruikt onder een commerciële licentie."] },
      { h: "Productgegevens", p: ["Open Food Facts (openfoodfacts.org), beschikbaar gesteld onder de Open Database License. Afzonderlijke inhoud van de database valt onder de Database Contents License."] },
      { h: "Locaties van gyms", p: ["© OpenStreetMap-bijdragers, onder de Open Database License (openstreetmap.org/copyright), doorzocht via Photon van Komoot."] },
      { h: "Software", p: ["Gebouwd met Expo, React Native en opensourcepakketten onder de MIT-licentie en vergelijkbare licenties. De volledige lijst wordt met de broncode meegeleverd."] },
      { h: "Handelsmerken", p: ["Apple, het Apple-logo, Google en het Google-logo zijn handelsmerken van hun eigenaren en staan alleen op de inlogknoppen, zoals hun richtlijnen toestaan. Garmin, Fitbit, Whoop, Oura, Strava en Basic-Fit zijn handelsmerken van hun eigenaren; CresQ is niet aan hen verbonden."] },
      { h: "Foto's", p: ["Alle foto's in de app zijn van onszelf of zijn toegevoegd door de persoon op wiens profiel ze staan."] },
    ],
  },
];

const docs: Record<Language, LegalDoc[]> = { nl, en };

/** One document in the reader's language. The Dutch text is the one that counts for a Dutch reader; English is there for whoever runs the app in English. */
export const legalDoc = (key: string, lang: Language = "nl") => docs[lang].find((d) => d.key === key);
