import type { CSSProperties } from 'react'
import { LeadForm } from '@/components/landing/lead-form'
import { CountUp } from '@/components/landing/count-up'
import { Reveal } from '@/components/landing/reveal'
import { LangToggle } from '@/components/lang-toggle'
import { getSettings } from '@/lib/settings'
import { getViewerLang } from '@/lib/i18n-viewer'
import { platformStats } from '@/lib/observations'
import { getPublicDiscoveries } from '@/lib/warehouse/discoveries'
import type { Language } from '@/lib/i18n'
import {
  Building2, Search, ClipboardCheck, MapPin, UtensilsCrossed, Cpu,
  Bot, Users, Globe, FileSearch, ListChecks, Check, X,
  ShieldCheck, Lock, CircleCheck, Home, Gauge, MessageSquare,
  TrendingUp, FileDown, Sparkles,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// Warm direction — core trio: cream #F1E8D7, charcoal #241C13, copper #B5683A.
// Everything else is a supporting tonal step on the same warm scale.
const BG = '#F1E8D7', BG_SOFT = '#E7DAC1', CARD = 'rgba(255,255,255,0.55)', CARD2 = 'rgba(255,255,255,0.82)'
const BORDER = 'rgba(36,28,19,0.16)', BORDER2 = 'rgba(36,28,19,0.10)'
const INK = '#241C13', MUTED = 'rgba(36,28,19,0.66)', FAINT = 'rgba(36,28,19,0.46)', GREEN = '#3f7d52'
const GRAD = 'linear-gradient(135deg, #C8804E 0%, #B5683A 50%, #9A5530 100%)'
const TEXT_GRAD = 'linear-gradient(90deg, #B5683A 0%, #8A4A28 100%)'
const FONT = 'var(--font-inter), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

const PROVIDERS = [
  { name: 'ChatGPT', color: '#19c37d' }, { name: 'Gemini', color: '#D08A5A' },
  { name: 'Claude', color: '#d97757' }, { name: 'Perplexity', color: '#20b8cd' },
]

// ── Bilingual copy ────────────────────────────────────────────────────────────
const T = {
  en: {
    nav: { product: 'Product', how: 'How it works', pricing: 'Pricing', resources: 'Intelligence', agencies: 'For Agencies', login: 'Log in', cta: 'Check my restaurant' },
    eyebrow: 'The AI Visibility Monitoring Platform for restaurants',
    heroLine: 'More guests now let AI decide', heroGrad: 'where to eat',
    heroSub: 'Finded continuously monitors how ChatGPT, Claude, Gemini and Perplexity recommend restaurants like yours — so you always know whether AI is sending guests to you, or to your competitors.',
    cta1: 'Check my restaurant for free', cta1sub: 'No card required · 2 minutes',
    cta2: 'View a live dashboard', cta2sub: 'See monitoring in action',
    trust: [['100% evidence-backed', 'Measured, never guesswork.'], ['Your data is private', 'We never share or sell data.'], ['Monitored continuously', 'New checks added over time.']],
    providersEyebrow: 'Monitored across all major AI assistants',
    sampleCaption: 'Live dashboard · representative data',
    trustedPre: 'Trusted by restaurant owners in', trustedCities: 'Amsterdam · Rotterdam · Utrecht', trustedPost: 'and across the Netherlands',
    insightsEyebrow: 'Finded Intelligence · Observation Warehouse',
    insightsFrame: 'Deterministic and reproducible from our Observation Warehouse, updated daily — measured, never AI-generated guesses.',
    insightsAnchorLabel: 'AI interactions analysed',
    statLabels: ['Restaurants monitored', 'AI interactions analysed', 'Audits completed', 'Cities covered', 'Cuisine types', 'AI models monitored'],
    insightsEmpty: 'Our Observation Warehouse grows with every check we run. Live platform intelligence — restaurants monitored, AI interactions analysed, cities and cuisines covered — appears here as the warehouse fills.',
    evidence: {
      eyebrow: 'See it in action',
      title: 'AI is already answering — sometimes without you',
      sub: 'When a guest asks an assistant where to eat, it names just a handful of restaurants. Finded monitors exactly which prompts you appear in — and which you don’t.',
      badge: 'Representative example',
      model: 'ChatGPT',
      promptLabel: 'A guest asks',
      prompt: 'What’s the best pasta in the Jordaan?',
      answerLabel: 'ChatGPT answers',
      answer: 'For great pasta in the Jordaan, locals love Pasta e Basta for its lively atmosphere, Toscanini for refined Tuscan cooking, and Trattoria Vesuvio for classic homemade dishes — all known for fresh, handmade pasta.',
      rivals: ['Pasta e Basta', 'Toscanini', 'Trattoria Vesuvio'],
      namedNote: '3 competitors named',
      absentName: 'Tavola Rosa',
      absentNote: 'your restaurant — not mentioned',
      caption: 'Illustrative example. Your live dashboard shows the actual prompts and AI responses behind every finding.',
    },
    whyTitle: 'Guests no longer only search Google.',
    whyBody: "They ask AI where to eat, where to celebrate, which place is romantic. These tools name only a few restaurants — if your competitors are mentioned and you aren't, you're losing a discovery channel that's quietly growing. Finded watches it for you, every month.",
    measureTitle: 'What Finded monitors',
    measure: [
      ['AI recommendations', 'Which AI models mention your restaurant, and how often.', 'e.g. Claude names you, ChatGPT doesn’t.'],
      ['Competitor comparison', 'Which restaurants AI recommends instead of you.', 'e.g. 3 rivals appear in 18/32 searches.'],
      ['Website analysis', 'Schema, menus, crawlability and content.', 'e.g. menu is a PDF AI can’t read.'],
      ['Google Business Profile', 'Reviews, categories and business attributes.', 'e.g. cuisine category missing.'],
      ['Evidence', 'The exact prompts and AI responses behind each finding.', 'e.g. the 12 prompts you’re absent from.'],
      ['Prioritised action plan', 'The most important improvements first.', 'e.g. add Restaurant schema — do first.'],
    ],
    howKicker: 'How it works', howTitle: 'From your website to continuous AI visibility monitoring',
    how: [
      ['1', 'Website crawl', 'We read your site the way AI does.'],
      ['2', 'AI prompt testing', 'Dozens of real searches across 4 models.'],
      ['3', 'Competitor comparison', 'Who gets named instead, and why.'],
      ['4', 'Evidence', 'The prompts & responses behind each finding.'],
      ['5', 'Recommendations', 'Prioritised, backed by data.'],
      ['6', 'Monitoring', 'We re-check every month and flag what changed.'],
    ],
    howNote: 'Your first check is the baseline. Every month after, Finded re-measures and shows you what changed and why.',
    dataEyebrow: 'The Observation Warehouse',
    dataTitle: 'The more we monitor, the smarter your recommendations get.',
    dataBody: 'Every check anonymously sharpens our understanding of how AI discovers restaurants. Because recommendations are measured across thousands of observations — not general SEO advice — they get more accurate over time. No individual restaurant’s data is ever shared. This is data ChatGPT doesn’t have.',
    dataLearn: "What we're learning",
    learn: ['are missing Restaurant schema', 'don’t have a crawlable HTML menu', 'have no FAQ content', 'are recommended by AI at all'],
    dataEmpty: 'As the warehouse grows we surface the most common issues here — like how many restaurants are missing Restaurant schema, rely on PDF menus, or have no FAQ. These benchmarks become stronger with every check.',
    dataFine: "Only aggregate, anonymous statistics — never individual restaurant data. We measure how AI recommends restaurants today and help you improve; we don't promise rankings or control AI.",
    researchHeading: 'Latest discoveries',
    researchLabels: { menu_detected: 'an HTML menu', schema_detected: 'Restaurant schema', reservation_widget: 'a reservation widget', faq_detected: 'an FAQ page', opening_hours: 'clear opening hours', review_links: 'review signals', social_links: 'social links' } as Record<string, string>,
    researchLine: (pct: number, label: string, up: boolean) => `Restaurants with ${label} are recommended ${pct}% ${up ? 'more' : 'less'} often`,
    researchTrend: (pct: number, up: boolean) => `Industry-wide AI visibility is ${up ? 'rising' : 'falling'} ${pct} points per month`,
    researchMeta: (n: number, c: number | null) => `${n.toLocaleString()} restaurants${c != null ? ` · ${c}% confidence` : ''}`,
    pricingKicker: 'Pricing', pricingTitle: 'Start free. Upgrade to continuous monitoring.',
    pricingSub: 'The free check tells you whether AI recommends you. The full audit explains why — and becomes your monitoring baseline. Implementation helps you fix it.',
    tiers: [
      { name: 'Free AI Visibility Check', price: '€0', cadence: '', q: 'Is AI recommending my restaurant?', badge: '', features: ['Your AI Visibility Dashboard', 'AI visibility status & score', 'Competitors mentioned instead', 'Top 3 findings + website snapshot', 'Download a summary PDF anytime'], cta: 'Open my free dashboard', note: 'No account, no card, no obligation.', highlight: false },
      { name: 'AI Visibility Check', price: '€49', cadence: 'one-time', q: 'Why do competitors appear more often?', badge: 'Most popular', features: ['Everything in the free check', 'All four AI models analysed', 'Prompt-level evidence', 'Competitor comparison & why they win', 'Website, menu & structured-data analysis', 'Evidence-backed recommendations', 'Becomes your monitoring baseline'], cta: 'Get the full check', note: 'Understand exactly why competitors appear more often.', highlight: true },
      { name: 'AI Visibility Implementation', price: '€299', cadence: 'one-time', q: 'Help me actually fix it.', badge: 'Best value', features: ['Everything in the check', 'Restaurant schema implemented', 'FAQ & AI-friendly content', 'Homepage & location improvements', 'Menu & Google Business improvements', 'Follow-up check (before / after)'], cta: 'Discuss implementation', note: 'We make your restaurant easier for AI to understand and recommend.', highlight: false },
    ],
    monitorBanner: { tag: 'Flagship · coming soon', title: 'AI Visibility Monitoring', body: 'Continuous monthly monitoring of how AI recommends you — what changed, why, and what to do next. Your free check and one-time check feed straight into it.', cta: 'Join the monitoring waitlist' },
    founderKicker: 'From the founder',
    founderQuote: (f: string) => `“Hi, I'm ${f}. I work with restaurants every day — and I built Finded because owners had no way of knowing whether AI recommends them, or their competitors.”`,
    founderBody: "Every completed audit improves how well we understand the way AI discovers restaurants. It's a small, independent platform built in the Netherlands. If you have a question, email me — I read every one.",
    leadTitle: 'See whether AI recommends your restaurant',
    leadSub: "Send your website and city, and we'll email you a link to your free AI Visibility Dashboard.",
    faqKicker: 'FAQ', faqTitle: 'Honest answers',
    faq: [
      ['Is the check really free?', 'Yes — the initial check is free and emailed to you. No account, no card, no obligation.'],
      ['How is this different from asking AI myself?', 'We don’t ask AI for advice. We measure how four AI models actually answer real diner searches, repeated across dozens of prompts, then compare you with the competitors they name — and back recommendations with data from other audited restaurants.'],
      ['Do you guarantee AI will recommend me?', 'No, and nobody honestly can. We measure how AI recommends restaurants today, explain why, and show what to improve. It’s measurement, not guaranteed rankings.'],
      ['Can AI answers change over time?', 'They can and do. That’s why we measure across multiple prompts and models and treat results as a snapshot — and why monthly monitoring is on the way.'],
      ['What do you need from me?', 'Just your restaurant’s website, your city, and an email to send the results to.'],
      ['What about my data?', 'We only use your details to prepare your report. Benchmarks are fully anonymous — individual restaurant data is never exposed.'],
    ],
    footerTagline: 'The AI Visibility Platform for restaurants. We measure how ChatGPT, Claude, Gemini and Perplexity recommend restaurants — and help you improve.',
    footerProduct: 'Product', footerCompany: 'Company',
    footerLinks: ['Free visibility check', 'What we measure', 'How it works', 'Pricing'],
    footerPrivacy: 'Privacy policy', footerTerms: 'Terms', footerBuilt: 'Built in the Netherlands',
    footerRights: '· We measure how AI recommends restaurants — not rankings.',
    mock: { score: 'AI Visibility', good: 'Good', scoreBody: 'You appear in AI recommendations — with room to grow.', points: 'points', weekly: '+3 this week', monthly: '+8 this month', lastRun: 'Last monitoring run · yesterday', providerTitle: 'Provider changes', competitors: 'Top Competitors', viewComparison: 'View full comparison →', overTime: 'Visibility over time', insight: 'Latest discovery', insightBody: 'Restaurants with a crawlable HTML menu are recommended 2.1× more often by AI assistants.', discoveryMeta: '2,184 restaurants · 96% confidence', recTitle: 'Top recommendation', recBody: 'Publish an HTML menu AI can read.', recGain: '+18% expected visibility', nav: ['Overview', 'What changed', 'Providers', 'Competitors', 'Recommendations', 'Benchmarks', 'Industry', 'Export'] },
  },
  nl: {
    nav: { product: 'Product', how: 'Hoe het werkt', pricing: 'Prijzen', resources: 'Intelligence', agencies: 'Voor bureaus', login: 'Inloggen', cta: 'Check mijn restaurant' },
    eyebrow: 'Het AI-zichtbaarheidsmonitoringplatform voor restaurants',
    heroLine: 'Steeds meer gasten laten AI bepalen', heroGrad: 'waar ze gaan eten',
    heroSub: 'Finded monitort continu hoe ChatGPT, Claude, Gemini en Perplexity restaurants zoals dat van jou aanbevelen — zodat je altijd weet of AI gasten naar jou stuurt, of naar je concurrenten.',
    cta1: 'Check mijn restaurant gratis', cta1sub: 'Geen creditcard · 2 minuten',
    cta2: 'Bekijk een live dashboard', cta2sub: 'Zie monitoring in actie',
    trust: [['100% op bewijs gebaseerd', 'Gemeten, nooit giswerk.'], ['Je gegevens zijn privé', 'We delen of verkopen nooit data.'], ['Continu gemonitord', 'Steeds nieuwe checks erbij.']],
    providersEyebrow: 'Gemonitord op alle grote AI-assistenten',
    sampleCaption: 'Live dashboard · representatieve data',
    trustedPre: 'Vertrouwd door restauranthouders in', trustedCities: 'Amsterdam · Rotterdam · Utrecht', trustedPost: 'en in heel Nederland',
    insightsEyebrow: 'Finded Intelligence · Observation Warehouse',
    insightsFrame: 'Deterministisch en reproduceerbaar uit onze Observation Warehouse, dagelijks bijgewerkt — gemeten, nooit door AI gegenereerd giswerk.',
    insightsAnchorLabel: 'AI-interacties geanalyseerd',
    statLabels: ['Restaurants gemonitord', 'AI-interacties geanalyseerd', 'Audits voltooid', 'Steden gedekt', 'Keukentypes', 'AI-modellen gemonitord'],
    insightsEmpty: 'Onze Observation Warehouse groeit met elke check die we draaien. Live platform-intelligence — gemonitorde restaurants, geanalyseerde AI-interacties, gedekte steden en keukens — verschijnt hier naarmate de warehouse zich vult.',
    evidence: {
      eyebrow: 'Zo ziet het eruit',
      title: 'AI geeft al antwoord — soms zonder jou',
      sub: 'Als een gast een assistent vraagt waar te eten, worden er maar een handvol restaurants genoemd. Finded monitort precies in welke prompts je verschijnt — en in welke niet.',
      badge: 'Representatief voorbeeld',
      model: 'ChatGPT',
      promptLabel: 'Een gast vraagt',
      prompt: 'Wat is het beste pastarestaurant in de Jordaan?',
      answerLabel: 'ChatGPT antwoordt',
      answer: 'Voor lekkere pasta in de Jordaan zijn locals dol op Pasta e Basta vanwege de levendige sfeer, Toscanini voor verfijnde Toscaanse keuken, en Trattoria Vesuvio voor klassieke huisgemaakte gerechten — allemaal bekend om verse, handgemaakte pasta.',
      rivals: ['Pasta e Basta', 'Toscanini', 'Trattoria Vesuvio'],
      namedNote: '3 concurrenten genoemd',
      absentName: 'Tavola Rosa',
      absentNote: 'jouw restaurant — niet genoemd',
      caption: 'Illustratief voorbeeld. Je live dashboard toont de werkelijke prompts en AI-antwoorden achter elke bevinding.',
    },
    whyTitle: 'Gasten zoeken niet meer alleen op Google.',
    whyBody: 'Ze vragen AI waar ze moeten eten, waar ze iets kunnen vieren, welke plek romantisch is. Deze tools noemen maar een paar restaurants — als je concurrenten worden genoemd en jij niet, verlies je een ontdekkingskanaal dat stilletjes groeit. Finded houdt het voor je in de gaten, elke maand.',
    measureTitle: 'Wat Finded monitort',
    measure: [
      ['AI-aanbevelingen', 'Welke AI-modellen je restaurant noemen, en hoe vaak.', 'bijv. Claude noemt je, ChatGPT niet.'],
      ['Concurrentievergelijking', 'Welke restaurants AI in plaats van jou aanbeveelt.', 'bijv. 3 concurrenten in 18/32 zoekopdrachten.'],
      ['Website-analyse', 'Schema, menu’s, crawlbaarheid en content.', 'bijv. menu is een PDF die AI niet kan lezen.'],
      ['Google-bedrijfsprofiel', 'Reviews, categorieën en bedrijfskenmerken.', 'bijv. keukencategorie ontbreekt.'],
      ['Bewijs', 'De exacte prompts en AI-antwoorden achter elke bevinding.', 'bijv. de 12 prompts waarin je ontbreekt.'],
      ['Geprioriteerd actieplan', 'De belangrijkste verbeteringen eerst.', 'bijv. voeg Restaurant-schema toe — eerst doen.'],
    ],
    howKicker: 'Hoe het werkt', howTitle: 'Van je website naar continue AI-zichtbaarheidsmonitoring',
    how: [
      ['1', 'Website-crawl', 'We lezen je site zoals AI dat doet.'],
      ['2', 'AI-prompttests', 'Tientallen echte zoekopdrachten over 4 modellen.'],
      ['3', 'Concurrentievergelijking', 'Wie er in plaats van jou wordt genoemd, en waarom.'],
      ['4', 'Bewijs', 'De prompts & antwoorden achter elke bevinding.'],
      ['5', 'Aanbevelingen', 'Geprioriteerd, onderbouwd met data.'],
      ['6', 'Monitoring', 'Elke maand opnieuw meten en tonen wat veranderde.'],
    ],
    howNote: 'Je eerste check is de nulmeting. Daarna meet Finded elke maand opnieuw en laat zien wat er veranderde en waarom.',
    dataEyebrow: 'De Observation Warehouse',
    dataTitle: 'Hoe meer we monitoren, hoe slimmer je aanbevelingen worden.',
    dataBody: 'Elke check scherpt anoniem ons inzicht aan in hoe AI restaurants ontdekt. Omdat aanbevelingen gemeten worden over duizenden observaties — geen algemeen SEO-advies — worden ze na verloop van tijd nauwkeuriger. Individuele restaurantdata wordt nooit gedeeld. Dit is data die ChatGPT niet heeft.',
    dataLearn: 'Wat we leren',
    learn: ['missen een Restaurant-schema', 'hebben geen crawlbaar HTML-menu', 'hebben geen FAQ-inhoud', 'worden überhaupt door AI aanbevolen'],
    dataEmpty: 'Naarmate de warehouse groeit tonen we hier de meest voorkomende problemen — zoals hoeveel restaurants een Restaurant-schema missen, op PDF-menu’s leunen of geen FAQ hebben. Deze benchmarks worden sterker met elke check.',
    dataFine: 'Alleen geaggregeerde, anonieme statistieken — nooit individuele restaurantdata. We meten hoe AI restaurants vandaag aanbeveelt en helpen je verbeteren; we beloven geen ranglijsten en sturen AI niet aan.',
    researchHeading: 'Laatste ontdekkingen',
    researchLabels: { menu_detected: 'een HTML-menu', schema_detected: 'Restaurant-schema', reservation_widget: 'een reserveringswidget', faq_detected: 'een FAQ-pagina', opening_hours: 'duidelijke openingstijden', review_links: 'reviewsignalen', social_links: 'social links' } as Record<string, string>,
    researchLine: (pct: number, label: string, up: boolean) => `Restaurants met ${label} worden ${pct}% ${up ? 'vaker' : 'minder vaak'} aanbevolen`,
    researchTrend: (pct: number, up: boolean) => `AI-zichtbaarheid in de hele sector ${up ? 'stijgt' : 'daalt'} ${pct} punten per maand`,
    researchMeta: (n: number, c: number | null) => `${n.toLocaleString()} restaurants${c != null ? ` · ${c}% betrouwbaarheid` : ''}`,
    pricingKicker: 'Prijzen', pricingTitle: 'Start gratis. Upgrade naar continue monitoring.',
    pricingSub: 'De gratis check vertelt je óf AI je aanbeveelt. De volledige audit legt uit waarom — en wordt je monitoring-nulmeting. Implementatie helpt je het op te lossen.',
    tiers: [
      { name: 'Gratis AI-zichtbaarheidscheck', price: '€0', cadence: '', q: 'Beveelt AI mijn restaurant aan?', badge: '', features: ['Je AI-zichtbaarheidsdashboard', 'AI-zichtbaarheidsstatus & score', 'Concurrenten die in plaats van jou worden genoemd', 'Top 3 bevindingen + websitesnapshot', 'Download altijd een samenvatting als PDF'], cta: 'Open mijn gratis dashboard', note: 'Geen account, geen creditcard, geen verplichting.', highlight: false },
      { name: 'AI-zichtbaarheidscheck', price: '€49', cadence: 'eenmalig', q: 'Waarom verschijnen concurrenten vaker?', badge: 'Populairst', features: ['Alles uit de gratis check', 'Alle vier de AI-modellen geanalyseerd', 'Bewijs op promptniveau', 'Concurrentievergelijking & waarom zij winnen', 'Website-, menu- & gestructureerde-data-analyse', 'Op bewijs gebaseerde aanbevelingen', 'Wordt je monitoring-nulmeting'], cta: 'Volledige check aanvragen', note: 'Begrijp precies waarom concurrenten vaker verschijnen.', highlight: true },
      { name: 'AI-zichtbaarheidsimplementatie', price: '€299', cadence: 'eenmalig', q: 'Help me het echt op te lossen.', badge: 'Beste keuze', features: ['Alles uit de check', 'Restaurant-schema geïmplementeerd', 'FAQ & AI-vriendelijke content', 'Homepage- & locatieverbeteringen', 'Menu- & Google-bedrijfsprofiel-verbeteringen', 'Vervolgcheck (voor / na)'], cta: 'Implementatie bespreken', note: 'We maken je restaurant makkelijker te begrijpen en aan te bevelen voor AI.', highlight: false },
    ],
    monitorBanner: { tag: 'Vlaggenschip · binnenkort', title: 'AI-zichtbaarheidsmonitoring', body: 'Continue maandelijkse monitoring van hoe AI je aanbeveelt — wat er veranderde, waarom, en wat je nu moet doen. Je gratis check en eenmalige check voeden er rechtstreeks in.', cta: 'Zet me op de monitoring-wachtlijst' },
    founderKicker: 'Van de oprichter',
    founderQuote: (f: string) => `“Hoi, ik ben ${f}. Ik werk elke dag met restaurants — en ik bouwde Finded omdat eigenaren geen idee hadden of AI hen aanbeveelt, of juist hun concurrenten.”`,
    founderBody: 'Elke voltooide audit verbetert hoe goed we begrijpen hoe AI restaurants ontdekt. Het is een klein, onafhankelijk platform gebouwd in Nederland. Heb je een vraag? Mail me — ik lees ze allemaal.',
    leadTitle: 'Zie of AI jouw restaurant aanbeveelt',
    leadSub: 'Stuur je website en plaats, en we mailen je een link naar je gratis AI-zichtbaarheidsdashboard.',
    faqKicker: 'FAQ', faqTitle: 'Eerlijke antwoorden',
    faq: [
      ['Is de check echt gratis?', 'Ja — de eerste check is gratis en wordt naar je gemaild. Geen account, geen creditcard, geen verplichting.'],
      ['Hoe verschilt dit van zelf aan AI vragen?', 'We vragen AI niet om advies. We meten hoe vier AI-modellen echte zoekopdrachten van gasten beantwoorden, herhaald over tientallen prompts, en vergelijken je met de concurrenten die ze noemen — onderbouwd met data van andere geauditeerde restaurants.'],
      ['Garanderen jullie dat AI mij aanbeveelt?', 'Nee, en dat kan niemand eerlijk beloven. We meten hoe AI restaurants vandaag aanbeveelt, leggen uit waarom en tonen wat je kunt verbeteren. Het is meting, geen gegarandeerde ranglijst.'],
      ['Kunnen AI-antwoorden veranderen?', 'Zeker. Daarom meten we over meerdere prompts en modellen en behandelen we resultaten als momentopname — en daarom komt er maandelijkse monitoring.'],
      ['Wat hebben jullie van mij nodig?', 'Alleen de website van je restaurant, je plaats en een e-mailadres om de resultaten naartoe te sturen.'],
      ['En mijn gegevens?', 'We gebruiken je gegevens alleen om je rapport te maken. Benchmarks zijn volledig anoniem — individuele restaurantdata wordt nooit getoond.'],
    ],
    footerTagline: 'Het AI-zichtbaarheidsplatform voor restaurants. We meten hoe ChatGPT, Claude, Gemini en Perplexity restaurants aanbevelen — en helpen je verbeteren.',
    footerProduct: 'Product', footerCompany: 'Bedrijf',
    footerLinks: ['Gratis zichtbaarheidscheck', 'Wat we meten', 'Hoe het werkt', 'Prijzen'],
    footerPrivacy: 'Privacybeleid', footerTerms: 'Voorwaarden', footerBuilt: 'Gebouwd in Nederland',
    footerRights: '· We meten hoe AI restaurants aanbeveelt — geen ranglijsten.',
    mock: { score: 'AI-zichtbaarheid', good: 'Goed', scoreBody: 'Je verschijnt in AI-aanbevelingen — met ruimte om te groeien.', points: 'punten', weekly: '+3 deze week', monthly: '+8 deze maand', lastRun: 'Laatste monitoringrun · gisteren', providerTitle: 'Wijzigingen per AI', competitors: 'Top concurrenten', viewComparison: 'Volledige vergelijking →', overTime: 'Zichtbaarheid over tijd', insight: 'Laatste ontdekking', insightBody: 'Restaurants met een crawlbaar HTML-menu worden 2,1× vaker aanbevolen door AI-assistenten.', discoveryMeta: '2.184 restaurants · 96% betrouwbaarheid', recTitle: 'Belangrijkste aanbeveling', recBody: 'Publiceer een HTML-menu dat AI kan lezen.', recGain: '+18% verwachte zichtbaarheid', nav: ['Overzicht', 'Wat veranderde', 'AI-modellen', 'Concurrenten', 'Aanbevelingen', 'Benchmarks', 'Sector', 'Export'] },
  },
}

type Copy = typeof T['en']

function Logo({ size = 30 }: { size?: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <span style={{ width: size, height: size, borderRadius: size * 0.28, background: GRAD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 16px -6px rgba(181,104,58,0.7)' }}>
        <span style={{ fontSize: size * 0.56, fontWeight: 800, color: '#fff', letterSpacing: -0.5 }}>F</span>
      </span>
      <span style={{ fontSize: size * 0.62, fontWeight: 700, color: INK, letterSpacing: -0.5 }}>finded</span>
    </span>
  )
}

function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 52, maxWidth: 720, marginLeft: 'auto', marginRight: 'auto' }}>
      {kicker && <div style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 14 }}>{kicker}</div>}
      <h2 style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, letterSpacing: -1.4, color: INK, lineHeight: 1.08 }}>{title}</h2>
      {sub && <p style={{ fontSize: 18, color: MUTED, marginTop: 16, lineHeight: 1.6 }}>{sub}</p>}
    </div>
  )
}

function Ring({ pct, size, stroke, label, sub, animate }: { pct: number; size: number; stroke: number; label: string; sub?: string; animate?: boolean }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, dash = (pct / 100) * c
  const id = `g${Math.round(pct)}${size}`
  // When `animate`, the progress arc draws in via CSS (stroke-dashoffset) once the
  // product shot scrolls into view — see .ring-draw in globals.css.
  const arc = animate
    ? { strokeDasharray: c, className: 'ring-draw', style: { ['--ring-c']: c, ['--ring-off']: c - dash } as CSSProperties }
    : { strokeDasharray: `${dash} ${c - dash}` }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#B5683A" /><stop offset="100%" stopColor="#D08A5A" /></linearGradient></defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round" {...arc} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="49%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.26, fontWeight: 800, fill: '#fff' }}>{label}</text>
      {sub && <text x="50%" y="65%" textAnchor="middle" dominantBaseline="central" style={{ fontFamily: FONT, fontSize: size * 0.11, fill: MUTED }}>{sub}</text>}
    </svg>
  )
}

function DashboardMock({ t }: { t: typeof T['en']['mock'] }) {
  // The preview is a real (dark) product screenshot framed on the warm page —
  // its own dark surface tokens, with the copper accent applied above.
  const INK = '#f4f5fa', MUTED = '#9a9fb6', FAINT = '#6f6a60', GREEN = '#34d399'
  const CARD = 'rgba(255,255,255,0.04)', BORDER = 'rgba(255,255,255,0.09)', BORDER2 = 'rgba(255,255,255,0.07)'
  const NAV_ICONS = [Home, Gauge, Bot, Users, ListChecks, Globe, TrendingUp]
  const competitors = [['1', 'La Bella Italia', 82, false], ['2', 'Casa di Roma', 75, true], ['3', 'Trattoria Milano', 68, false], ['4', 'Osteria da Vinci', 63, false], ['5', 'Il Gusto', 58, false]] as const
  const providerTrends = [['ChatGPT', 'up'], ['Claude', 'flat'], ['Gemini', 'down'], ['Perplexity', 'up']] as const
  const vals = [38, 52, 66, 64, 71, 75, 72]
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const X = (i: number) => 44 + i * (456 / 6), Y = (v: number) => 150 - v * 1.3
  const line = vals.map((v, i) => `${X(i)},${Y(v)}`).join(' '), area = `${line} ${X(6)},150 ${X(0)},150`
  const cardBox = { background: CARD, border: `1px solid ${BORDER2}`, borderRadius: 14, padding: 18 } as const
  const eyebrow = { fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase' as const, letterSpacing: 1 }
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 20, background: 'linear-gradient(180deg, #2a2017, #181009)', boxShadow: '0 60px 120px -50px rgba(40,28,19,0.5), 0 0 0 1px rgba(255,255,255,0.03)', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(0, 210px) 1fr' }}>
      <aside style={{ borderRight: `1px solid ${BORDER2}`, padding: '20px 14px', display: 'flex', flexDirection: 'column', gap: 4, background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ padding: '2px 8px 16px' }}><Logo size={24} /></div>
        {t.nav.slice(0, 7).map((label, i) => {
          const Icon = NAV_ICONS[i]; const active = i === 0
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#fff' : MUTED, background: active ? 'rgba(181,104,58,0.16)' : 'transparent', border: active ? '1px solid rgba(181,104,58,0.3)' : '1px solid transparent' }}>
              <Icon style={{ width: 15, height: 15, color: active ? '#B5683A' : FAINT }} /> {label}
            </div>
          )
        })}
        <div style={{ borderTop: `1px solid ${BORDER2}`, margin: '10px 0', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', fontSize: 13, color: MUTED }}><FileDown style={{ width: 15, height: 15, color: FAINT }} /> {t.nav[7]}</div>
        </div>
      </aside>
      <div style={{ padding: 18, display: 'grid', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr 1fr', gap: 14 }}>
          <div style={cardBox}>
            <div style={eyebrow}>{t.score}</div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
              <Ring pct={72} size={104} stroke={11} label="72" sub="/100" animate />
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: GREEN, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.3)', padding: '3px 9px', borderRadius: 6 }}>{t.good}</span>
                <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: '10px 0 0' }}>{t.scoreBody}</p>
                <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, marginTop: 8 }}>↑ {t.weekly} <span style={{ color: FAINT, fontWeight: 500 }}>· {t.monthly}</span></div>
                <div style={{ fontSize: 10.5, color: FAINT, marginTop: 6 }}>{t.lastRun}</div>
              </div>
            </div>
          </div>
          <div style={cardBox}>
            <div style={eyebrow}>{t.providerTitle}</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {providerTrends.map(([name, dir]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: PROVIDERS.find((p) => p.name === name)?.color ?? '#B5683A' }} />
                  <span style={{ fontSize: 12.5, color: INK, flex: 1 }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: dir === 'up' ? GREEN : dir === 'down' ? '#f0846b' : FAINT }}>{dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→'}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={cardBox}>
            <div style={eyebrow}>{t.competitors}</div>
            <div style={{ marginTop: 10, display: 'grid', gap: 2 }}>
              {competitors.map(([rank, name, score, hot], ci) => (
                <div key={name} className="comp-row" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 7px', borderRadius: 7, background: hot ? 'rgba(181,104,58,0.12)' : 'transparent', ['--d']: `${0.25 + ci * 0.08}s` } as CSSProperties}>
                  <span style={{ fontSize: 11, color: FAINT, width: 10 }}>{rank}</span>
                  <span style={{ fontSize: 12.5, color: INK, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: hot ? '#B5683A' : MUTED }}>{score}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: '#B5683A', fontWeight: 600, marginTop: 10 }}>{t.viewComparison}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
          <div style={cardBox}>
            <div style={eyebrow}>{t.overTime}</div>
            <svg viewBox="0 0 520 175" style={{ width: '100%', height: 'auto', marginTop: 8 }}>
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(181,104,58,0.35)" /><stop offset="100%" stopColor="rgba(181,104,58,0)" /></linearGradient>
                <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#D08A5A" /><stop offset="100%" stopColor="#B5683A" /></linearGradient>
              </defs>
              {[0, 25, 50, 75, 100].map((g) => (<g key={g}><line x1={44} y1={Y(g)} x2={510} y2={Y(g)} stroke="rgba(255,255,255,0.06)" strokeWidth={1} /><text x={32} y={Y(g) + 3} textAnchor="end" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{g}</text></g>))}
              <polygon points={area} fill="url(#area)" />
              <polyline points={line} fill="none" stroke="url(#stroke)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
              {vals.map((v, i) => <circle key={i} cx={X(i)} cy={Y(v)} r={2.6} fill="#B5683A" />)}
              <circle cx={X(6)} cy={Y(72)} r={4.5} fill="#fff" stroke="#B5683A" strokeWidth={2} />
              <g transform={`translate(${X(6) - 14}, ${Y(72) - 24})`}><rect width={30} height={17} rx={4} fill="#B5683A" /><text x={15} y={12} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, fill: '#fff' }}>72</text></g>
              {months.map((m, i) => <text key={m} x={X(i)} y={170} textAnchor="middle" style={{ fontFamily: FONT, fontSize: 9, fill: FAINT }}>{m}</text>)}
            </svg>
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ ...cardBox, background: 'linear-gradient(135deg, rgba(181,104,58,0.16), rgba(208,138,90,0.06))', border: '1px solid rgba(181,104,58,0.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...eyebrow, color: '#B5683A' }}><Sparkles style={{ width: 13, height: 13 }} /> {t.insight}</div>
              <p style={{ fontSize: 12.5, color: INK, lineHeight: 1.5, margin: '10px 0 0' }}>{t.insightBody}</p>
              <div style={{ fontSize: 11, color: FAINT, marginTop: 8 }}>{t.discoveryMeta}</div>
            </div>
            <div style={cardBox}>
              <div style={eyebrow}>{t.recTitle}</div>
              <p style={{ fontSize: 12.5, color: INK, lineHeight: 1.5, margin: '10px 0 8px' }}>{t.recBody}</p>
              <span style={{ fontSize: 12, fontWeight: 800, color: GREEN, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.3)', padding: '3px 9px', borderRadius: 6 }}>{t.recGain}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EvidenceExample({ t }: { t: typeof T['en']['evidence'] }) {
  // A real AI answer shown as a dark chat surface framed on the warm page.
  const INK = '#f4f5fa', MUTED = '#9a9fb6', FAINT = '#6f6a60'
  const BORDER = 'rgba(255,255,255,0.09)', BORDER2 = 'rgba(255,255,255,0.07)'
  const provColor = PROVIDERS.find((p) => p.name === t.model)?.color ?? '#B5683A'
  // Highlight the named rivals inside the AI answer (deterministic string split).
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${t.rivals.map(esc).join('|')})`, 'g')
  const rivalSet = new Set<string>(t.rivals)
  const parts = t.answer.split(re)
  const iconWrap = { width: 32, height: 32, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as const
  const chip = { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, padding: '6px 11px', borderRadius: 8 } as const
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 20, background: 'linear-gradient(180deg, #2a2017, #181009)', boxShadow: '0 40px 100px -50px rgba(40,28,19,0.45)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: `1px solid ${BORDER2}`, background: 'rgba(255,255,255,0.015)' }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#B5683A', background: 'rgba(181,104,58,0.12)', border: '1px solid rgba(181,104,58,0.28)', padding: '4px 9px', borderRadius: 6 }}>{t.badge}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#cfd2e0' }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: provColor, boxShadow: `0 0 12px -2px ${provColor}` }} />{t.model}
        </span>
      </div>
      <div style={{ padding: 'clamp(18px, 3vw, 26px)', display: 'grid', gap: 18 }}>
        {/* Guest prompt */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ ...iconWrap, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}` }}><MessageSquare style={{ width: 16, height: 16, color: MUTED }} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>{t.promptLabel}</div>
            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.05)', border: `1px solid ${BORDER}`, borderRadius: '4px 14px 14px 14px', padding: '11px 16px', fontSize: 15.5, fontWeight: 600, color: INK }}>{t.prompt}</div>
          </div>
        </div>
        {/* AI answer */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{ ...iconWrap, background: `${provColor}1f`, border: `1px solid ${provColor}55` }}><Bot style={{ width: 16, height: 16, color: provColor }} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 7 }}>{t.answerLabel}</div>
            <p style={{ fontSize: 15, color: '#cfd2e0', lineHeight: 1.7, margin: 0 }}>
              {parts.map((p, i) => rivalSet.has(p)
                ? <strong key={i} style={{ color: '#fff', fontWeight: 700, background: 'rgba(181,104,58,0.18)', borderBottom: '1.5px solid rgba(181,104,58,0.7)', borderRadius: 3, padding: '0 3px' }}>{p}</strong>
                : <span key={i}>{p}</span>)}
            </p>
          </div>
        </div>
        {/* Verdict chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', borderTop: `1px solid ${BORDER2}`, paddingTop: 16 }}>
          <span style={{ ...chip, color: '#B5683A', background: 'rgba(181,104,58,0.1)', border: '1px solid rgba(181,104,58,0.28)' }}><CircleCheck style={{ width: 14, height: 14 }} /> {t.namedNote}</span>
          <span style={{ ...chip, color: '#fda4af', background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.32)' }}>
            <X style={{ width: 14, height: 14 }} /> <strong style={{ color: '#fff', fontWeight: 700 }}>{t.absentName}</strong> — {t.absentNote}
          </span>
        </div>
      </div>
    </div>
  )
}

export default async function LandingPage() {
  const settings = await getSettings()
  const lang: Language = await getViewerLang(settings.defaultLanguage)
  const t = T[lang]
  const contactEmail = settings.contactEmail
  const founder = settings.founderName

  const stats = await platformStats().catch(() => null)
  const discoveries = await getPublicDiscoveries(4).catch(() => [])
  const haveData = !!stats && stats.audits > 0
  const haveBench = !!stats && stats.n >= 20
  const rate = (k: 'restaurant_schema' | 'html_menu' | 'faq_present') => stats ? Math.round((stats.factRates[k] ?? 0) * 100) : 0

  const card = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 26 } as const
  const STAT_ICONS = [Building2, Search, ClipboardCheck, MapPin, UtensilsCrossed, Cpu]
  const statValues = stats ? [stats.restaurants || stats.audits, stats.searches, stats.audits, stats.cities, stats.cuisines, stats.models] : []
  const MEASURE_ICONS = [Bot, Users, Globe, MapPin, FileSearch, ListChecks]
  const navLink = { fontSize: 14, fontWeight: 500, color: MUTED, textDecoration: 'none' } as const
  const TRUST_ICONS = [ShieldCheck, Lock, CircleCheck]

  return (
    <div id="top" style={{ fontFamily: FONT, background: BG, minHeight: '100vh', WebkitFontSmoothing: 'antialiased', color: INK, position: 'relative', zIndex: 1 }}>
      {/* Nav */}
      <nav style={{ background: 'rgba(241,232,215,0.82)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER2}`, padding: '0 24px', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ textDecoration: 'none' }}><Logo /></a>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <a href="#measure" style={navLink}>{t.nav.product}</a>
          <a href="#how" style={navLink}>{t.nav.how}</a>
          <a href="#pricing" style={navLink}>{t.nav.pricing}</a>
          <a href="#data" style={navLink}>{t.nav.resources}</a>
          <a href="/agencies" style={navLink}>{t.nav.agencies}</a>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangToggle current={lang} tone="light" />
          <a href="/portal/login" style={{ ...navLink, fontWeight: 600 }}>{t.nav.login}</a>
          <a href="#check" style={{ fontSize: 13.5, fontWeight: 700, background: GRAD, color: '#fff', padding: '10px 18px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 10px 24px -10px rgba(181,104,58,0.7)' }}>{t.nav.cta}</a>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden', borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ position: 'absolute', top: -260, left: '50%', transform: 'translateX(-50%)', width: 1100, height: 620, background: 'radial-gradient(ellipse at center, rgba(181,104,58,0.28), rgba(181,104,58,0.10) 40%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,6vw,84px) 24px 0', position: 'relative', textAlign: 'center' }}>
          <div className="rise" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: CARD, border: `1px solid ${BORDER}`, color: MUTED, fontSize: 11.5, fontWeight: 700, padding: '7px 16px', borderRadius: 20, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 30 }}>{t.eyebrow}</div>
          <h1 className="rise" style={{ fontSize: 'clamp(40px, 7vw, 78px)', fontWeight: 800, lineHeight: 1.0, letterSpacing: -2.6, marginBottom: 26 }}>
            {t.heroLine}<br /><span style={{ background: TEXT_GRAD, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>{t.heroGrad}</span>
          </h1>
          <p className="rise rise-2" style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: MUTED, lineHeight: 1.6, margin: '0 auto 36px', maxWidth: 660 }}>{t.heroSub}</p>
          <div className="rise rise-2" style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
            <a href="#check" className="btn" style={{ display: 'flex', alignItems: 'center', gap: 11, background: GRAD, color: '#fff', padding: '14px 26px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 16px 36px -14px rgba(181,104,58,0.8)' }}>
              <Sparkles style={{ width: 18, height: 18 }} />
              <span style={{ textAlign: 'left' }}><span style={{ display: 'block', fontSize: 15.5, fontWeight: 700 }}>{t.cta1}</span><span style={{ display: 'block', fontSize: 11.5, opacity: 0.85 }}>{t.cta1sub}</span></span>
            </a>
            <a href="#sample" className="btn" style={{ display: 'flex', alignItems: 'center', gap: 11, background: CARD2, color: INK, padding: '14px 26px', borderRadius: 12, textDecoration: 'none', border: `1px solid ${BORDER}` }}>
              <FileSearch style={{ width: 18, height: 18, color: MUTED }} />
              <span style={{ textAlign: 'left' }}><span style={{ display: 'block', fontSize: 15.5, fontWeight: 700 }}>{t.cta2}</span><span style={{ display: 'block', fontSize: 11.5, color: FAINT }}>{t.cta2sub}</span></span>
            </a>
          </div>
          <div className="rise rise-3" style={{ display: 'flex', gap: 'clamp(24px,5vw,64px)', justifyContent: 'center', flexWrap: 'wrap', margin: '44px 0 8px' }}>
            {t.trust.map(([title, desc], i) => {
              const Icon = TRUST_ICONS[i]
              return (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 11, textAlign: 'left' }}>
                  <span style={{ display: 'inline-flex', width: 36, height: 36, borderRadius: 10, background: CARD, border: `1px solid ${BORDER}`, alignItems: 'center', justifyContent: 'center' }}><Icon style={{ width: 17, height: 17, color: '#B5683A' }} /></span>
                  <span><span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: INK }}>{title}</span><span style={{ display: 'block', fontSize: 12, color: FAINT }}>{desc}</span></span>
                </div>
              )
            })}
          </div>
          <Reveal className="reveal-shot" style={{ marginTop: 44 }}>
            <div id="sample" style={{ scrollMarginTop: 80, position: 'relative' }}>
              {/* indigo glow to lift the showpiece off the hero */}
              <div aria-hidden style={{ position: 'absolute', inset: '-12% -8% -6%', background: 'radial-gradient(ellipse at 50% 30%, rgba(181,104,58,0.30), transparent 66%)', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', background: 'linear-gradient(180deg, #2e2419, #1c150d)', border: '1px solid rgba(36,28,19,0.45)', borderRadius: 28, padding: 'clamp(12px, 1.8vw, 20px)', boxShadow: '0 60px 130px -50px rgba(120,70,40,0.55), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
                <DashboardMock t={t.mock} />
              </div>
              <p style={{ fontSize: 12.5, color: FAINT, marginTop: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>{t.sampleCaption}</p>
            </div>
          </Reveal>
          <div style={{ marginTop: 44 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1.6, marginBottom: 18 }}>{t.providersEyebrow}</div>
            <div style={{ display: 'flex', gap: 'clamp(20px,4vw,46px)', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center', paddingBottom: 8 }}>
              {PROVIDERS.map((p) => (
                <span key={p.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 700, color: 'rgba(36,28,19,0.74)' }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', background: p.color, display: 'inline-block', boxShadow: `0 0 16px -2px ${p.color}` }} />{p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Evidence — one representative prompt + AI answer, rival-marked */}
      <section id="evidence" style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}`, scrollMarginTop: 70 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '64px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 12 }}>{t.evidence.eyebrow}</div>
          <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 38px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1.12, marginBottom: 14, maxWidth: '20ch' }}>{t.evidence.title}</h2>
          <p style={{ fontSize: 17, color: 'rgba(36,28,19,0.74)', lineHeight: 1.6, maxWidth: '60ch', marginBottom: 28 }}>{t.evidence.sub}</p>
          <EvidenceExample t={t.evidence} />
          <p style={{ fontSize: 12.5, color: FAINT, marginTop: 16, lineHeight: 1.6, maxWidth: '62ch' }}>{t.evidence.caption}</p>
        </div>
      </section>

      {/* Insights — rigor-led: anchor metric + supporting counts */}
      <section style={{ background: BG, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '60px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 10 }}>{t.insightsEyebrow}</div>
          <p style={{ fontSize: 14.5, color: 'rgba(36,28,19,0.74)', lineHeight: 1.6, maxWidth: '60ch', marginBottom: 30 }}>{t.insightsFrame}</p>
          {haveData ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(0, 1.8fr)', gap: 18, alignItems: 'stretch' }} className="insights-grid">
              {/* Anchor: AI searches performed (the strongest figure) */}
              <div style={{ background: 'linear-gradient(160deg, rgba(181,104,58,0.16), rgba(208,138,90,0.05))', border: '1px solid rgba(181,104,58,0.3)', borderRadius: 18, padding: '26px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ display: 'inline-flex', width: 40, height: 40, borderRadius: 11, background: 'rgba(181,104,58,0.22)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Search style={{ width: 20, height: 20, color: '#B5683A' }} /></span>
                <div style={{ fontSize: 'clamp(46px, 6vw, 64px)', fontWeight: 800, letterSpacing: -2.5, color: INK, lineHeight: 1 }}><CountUp value={statValues[1]} /></div>
                <div style={{ fontSize: 14, color: MUTED, marginTop: 8, fontWeight: 600 }}>{t.insightsAnchorLabel}</div>
              </div>
              {/* Supporting counts, demoted */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {[0, 2, 3, 4, 5].map((i) => {
                  const Icon = STAT_ICONS[i]
                  return (
                    <div key={i} className="card-fx" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 16px' }}>
                      <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 8, background: 'rgba(181,104,58,0.13)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Icon style={{ width: 15, height: 15, color: '#B5683A' }} /></span>
                      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.8, color: INK }}><CountUp value={statValues[i]} /></div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{t.statLabels[i]}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 15.5, color: 'rgba(36,28,19,0.74)', maxWidth: '62ch', lineHeight: 1.6 }}>{t.insightsEmpty}</p>
          )}
        </div>
      </section>

      {/* Why — editorial, left-aligned on a lifted panel */}
      <section style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '72px 24px' }}>
          <div style={{ position: 'relative', overflow: 'hidden', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 22, padding: 'clamp(28px, 4vw, 46px)', maxWidth: 880 }}>
            <span style={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', background: GRAD }} />
            <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 38px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 16, lineHeight: 1.12, maxWidth: '18ch' }}>{t.whyTitle}</h2>
            <p style={{ fontSize: 17.5, color: 'rgba(36,28,19,0.74)', lineHeight: 1.65, maxWidth: '60ch', margin: 0 }}>{t.whyBody}</p>
          </div>
        </div>
      </section>

      {/* Measure */}
      <section id="measure" style={{ background: BG, borderBottom: `1px solid ${BORDER2}`, scrollMarginTop: 70 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '84px 24px' }}>
        <SectionTitle title={t.measureTitle} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
          {t.measure.map(([title, d, ex], i) => {
            const Icon = MEASURE_ICONS[i]
            return (
              <div key={title} className="card-fx" style={card}>
                <span style={{ display: 'inline-flex', width: 42, height: 42, borderRadius: 12, background: 'rgba(181,104,58,0.14)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Icon style={{ width: 20, height: 20, color: '#B5683A' }} /></span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 8 }}>{title}</h3>
                <p style={{ fontSize: 14.5, color: MUTED, lineHeight: 1.55, marginBottom: 12 }}>{d}</p>
                <div style={{ fontSize: 12.5, color: '#B5683A', background: 'rgba(181,104,58,0.08)', border: `1px solid ${BORDER}`, borderRadius: 8, padding: '7px 10px' }}>{ex}</div>
              </div>
            )
          })}
        </div>
        </div>
      </section>

      {/* How */}
      <section id="how" style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}`, scrollMarginTop: 70 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '84px 24px' }}>
        <SectionTitle kicker={t.howKicker} title={t.howTitle} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
          {t.how.map(([n, title, d]) => (
            <div key={n} className="card-fx" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: GRAD, color: '#fff', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>{n}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: INK, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: FAINT, marginTop: 24 }}>{t.howNote}</p>
        </div>
      </section>

      {/* Data */}
      <section id="data" style={{ background: BG, borderBottom: `1px solid ${BORDER2}`, position: 'relative', overflow: 'hidden', scrollMarginTop: 60 }}>
        <div style={{ position: 'absolute', top: -120, right: -80, width: 460, height: 460, borderRadius: '50%', background: 'radial-gradient(circle, rgba(181,104,58,0.22), transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 940, margin: '0 auto', padding: '76px 24px', position: 'relative' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.8, marginBottom: 18 }}>{t.dataEyebrow}</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.3, lineHeight: 1.1, marginBottom: 20, maxWidth: '20ch' }}>{t.dataTitle}</h2>
          <p style={{ fontSize: 17.5, color: 'rgba(36,28,19,0.74)', lineHeight: 1.7, marginBottom: 32, maxWidth: '62ch' }}>{t.dataBody}</p>
          <div style={{ fontSize: 12, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>{t.dataLearn}</div>
          {haveBench ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }}>
              {[`${100 - rate('restaurant_schema')}%`, `${100 - rate('html_menu')}%`, `${100 - rate('faq_present')}%`, `${stats!.pctMentioned != null ? Math.round(stats!.pctMentioned * 100) : 0}%`].map((v, i) => (
                <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: INK }}>{v}</div>
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>{t.learn[i]}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, fontSize: 14.5, color: MUTED, maxWidth: 720 }}>{t.dataEmpty}</div>
          )}
          {discoveries.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: FAINT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>{t.researchHeading}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {discoveries.map((d) => (
                  <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                    <span style={{ display: 'inline-flex', width: 26, height: 26, borderRadius: 7, background: 'rgba(181,104,58,0.13)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sparkles style={{ width: 13, height: 13, color: '#B5683A' }} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 14, color: INK, fontWeight: 600, lineHeight: 1.4 }}>
                        {d.kind === 'trend' ? t.researchTrend(d.effectPct, d.dir === 'up') : t.researchLine(d.effectPct, t.researchLabels[d.key] ?? d.key, d.dir === 'up')}
                      </span>
                      <span style={{ display: 'block', fontSize: 11.5, color: FAINT, marginTop: 2 }}>{t.researchMeta(d.measured, d.confidence != null ? Math.round(d.confidence * 100) : null)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: FAINT, marginTop: 26, lineHeight: 1.6 }}>{t.dataFine}</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ background: BG_SOFT, borderBottom: `1px solid ${BORDER2}`, scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px' }}>
          <SectionTitle kicker={t.pricingKicker} title={t.pricingTitle} sub={t.pricingSub} />
          {/* Flagship: monitoring (messaging-only — waitlist, no billing yet) */}
          <div style={{ position: 'relative', overflow: 'hidden', background: GRAD, borderRadius: 20, padding: 'clamp(22px, 3vw, 32px)', marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 30px 70px -40px rgba(181,104,58,0.7)' }}>
            <div style={{ maxWidth: 620 }}>
              <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#fff', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', padding: '4px 10px', borderRadius: 999, marginBottom: 12 }}>{t.monitorBanner.tag}</span>
              <h3 style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 800, color: '#fff', letterSpacing: -0.8, marginBottom: 8 }}>{t.monitorBanner.title}</h3>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.92)', lineHeight: 1.6, margin: 0 }}>{t.monitorBanner.body}</p>
            </div>
            <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(t.monitorBanner.title + ' — waitlist')}`} className="btn" style={{ flexShrink: 0, background: '#fff', color: '#241C13', fontWeight: 700, fontSize: 14.5, padding: '13px 22px', borderRadius: 12, textDecoration: 'none', boxShadow: '0 14px 30px -12px rgba(0,0,0,0.35)' }}>{t.monitorBanner.cta}</a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, alignItems: 'stretch' }}>
            {t.tiers.map((p, idx) => {
              const href = idx === 0 ? '#check' : `mailto:${contactEmail}?subject=${encodeURIComponent(p.name)}`
              return (
                <div key={p.name} className="card-fx" style={{ background: p.highlight ? 'linear-gradient(180deg, rgba(181,104,58,0.14), rgba(208,138,90,0.05))' : CARD, color: INK, border: `1px solid ${p.highlight ? 'rgba(181,104,58,0.4)' : BORDER}`, borderRadius: 20, padding: 26, display: 'flex', flexDirection: 'column', boxShadow: p.highlight ? '0 30px 70px -40px rgba(181,104,58,0.6)' : 'none' }}>
                  {p.badge && <span style={{ alignSelf: 'flex-start', fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#fff', background: GRAD, padding: '4px 9px', borderRadius: 6, marginBottom: 14 }}>{p.badge}</span>}
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{p.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '10px 0 6px' }}>
                    <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5 }}>{p.price}</span>
                    {p.cadence && <span style={{ fontSize: 13, color: MUTED }}>{p.cadence}</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#B5683A', marginBottom: 18 }}>{p.q}</div>
                  <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
                    {p.features.map((f) => (<div key={f} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}><Check style={{ width: 15, height: 15, color: '#B5683A', flexShrink: 0, marginTop: 2 }} /><span style={{ fontSize: 13.5, color: 'rgba(36,28,19,0.78)', lineHeight: 1.5 }}>{f}</span></div>))}
                  </div>
                  <a href={href} className="btn" style={{ marginTop: 'auto', textAlign: 'center', textDecoration: 'none', fontWeight: 700, fontSize: 14.5, padding: '14px 16px', borderRadius: 11, background: p.highlight ? GRAD : CARD2, color: p.highlight ? '#fff' : INK, border: p.highlight ? 'none' : `1px solid ${BORDER}`, boxShadow: p.highlight ? '0 14px 30px -12px rgba(181,104,58,0.7)' : 'none' }}>{p.cta}</a>
                  <p style={{ fontSize: 12, color: FAINT, marginTop: 12, textAlign: 'center', lineHeight: 1.45 }}>{p.note}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section style={{ background: BG, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '92px 24px', display: 'flex', gap: 'clamp(24px, 4vw, 48px)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flexShrink: 0 }}>
            <div style={{ width: 150, height: 150, borderRadius: 24, background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 60px -28px rgba(181,104,58,0.7)' }}><span style={{ fontSize: 52, fontWeight: 800, color: '#fff' }}>{founder.charAt(0)}</span></div>
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B5683A', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14 }}>{t.founderKicker}</div>
            <p style={{ fontSize: 'clamp(20px, 2.4vw, 26px)', color: INK, lineHeight: 1.35, marginBottom: 14, fontWeight: 700, letterSpacing: -0.6 }}>{t.founderQuote(founder)}</p>
            <p style={{ fontSize: 16, color: MUTED, lineHeight: 1.65, marginBottom: 18 }}>{t.founderBody}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>{founder}</span><span style={{ color: FAINT }}>·</span>
              <a href={`mailto:${contactEmail}`} style={{ fontSize: 14, color: '#B5683A', fontWeight: 600, textDecoration: 'none' }}>{contactEmail}</a>
            </div>
          </div>
        </div>
      </section>

      {/* Lead capture */}
      <section id="check" style={{ background: BG_SOFT, position: 'relative', overflow: 'hidden', scrollMarginTop: 60, borderBottom: `1px solid ${BORDER2}` }}>
        <div style={{ position: 'absolute', top: -160, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at center, rgba(181,104,58,0.25), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '96px 24px', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: -1.2, marginBottom: 14, color: INK }}>{t.leadTitle}</h2>
          <p style={{ fontSize: 17, color: MUTED, lineHeight: 1.6, marginBottom: 30 }}>{t.leadSub}</p>
          <div style={{ background: '#fff', borderRadius: 18, padding: 'clamp(20px, 3vw, 28px)', textAlign: 'left', boxShadow: '0 30px 70px -30px rgba(36,28,19,0.30)', border: `1px solid ${BORDER}` }}><LeadForm /></div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: BG }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '92px 24px' }}>
          <SectionTitle kicker={t.faqKicker} title={t.faqTitle} />
          <div style={{ display: 'grid', gap: 12 }}>
            {t.faq.map(([q, a]) => (
              <details key={q} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px' }}>
                <summary style={{ fontSize: 15, fontWeight: 700, color: INK, cursor: 'pointer', listStyle: 'none' }}>{q}</summary>
                <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, marginTop: 10 }}>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER2}`, background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px', display: 'flex', flexWrap: 'wrap', gap: 28, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ maxWidth: 340 }}>
            <div style={{ marginBottom: 10 }}><Logo /></div>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: MUTED }}>{t.footerTagline}</p>
          </div>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>{t.footerProduct}</div>
            {['#check', '#measure', '#how', '#pricing'].map((href, i) => <a key={href} href={href} style={{ color: 'rgba(36,28,19,0.74)', textDecoration: 'none', display: 'block' }}>{t.footerLinks[i]}</a>)}
          </div>
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: FAINT, marginBottom: 6 }}>{t.footerCompany}</div>
            <a href={`mailto:${contactEmail}`} style={{ color: 'rgba(36,28,19,0.74)', textDecoration: 'none', display: 'block' }}>{contactEmail}</a>
            <a href="/privacy" style={{ color: 'rgba(36,28,19,0.74)', textDecoration: 'none', display: 'block' }}>{t.footerPrivacy}</a>
            <a href="/terms" style={{ color: 'rgba(36,28,19,0.74)', textDecoration: 'none', display: 'block' }}>{t.footerTerms}</a>
            <div style={{ color: MUTED, marginTop: 6 }}>{t.footerBuilt}</div>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${BORDER2}`, padding: '16px 24px', textAlign: 'center', fontSize: 12, color: FAINT }}>© {2026} Finded {t.footerRights}</div>
      </footer>
    </div>
  )
}
