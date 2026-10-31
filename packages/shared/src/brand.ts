// Ninja's own facts, from ninja-antwerp.be (home, menu, FAQ, jobs pages and the menu PDF of June 2026) and the
// restaurant's listing on Le Fooding. Everything in this file is real; the demo's own inventions live elsewhere.

export const NINJA = {
  name: 'Ninja',
  fullName: 'Ninja Antwerp',
  tagline: 'Authentic Kebab & Grill in Antwerp',
  street: 'Vlaamsekaai 52',
  postcode: '2000',
  city: 'Antwerpen',
  area: 'Het Zuid',
  /** Vlaamsekaai 52, on the old docks of the Zuid. */
  lat: 51.2087,
  lon: 4.3926,
  phone: '+32 471 87 56 59',
  phoneHref: 'tel:+32471875659',
  email: 'hello@ninja-antwerp.be',
  vat: 'BE0648796376',
  site: 'https://www.ninja-antwerp.be',
  instagram: 'ninja.antwerp',
  instagramUrl: 'https://instagram.com/ninja.antwerp',
  tiktok: 'ninja_antwerp',
  tiktokUrl: 'https://www.tiktok.com/@ninja_antwerp',
  maps: 'https://maps.app.goo.gl/1LSteK4vqD1VMoGc6',
  menuPdf: 'https://www.ninja-antwerp.be/NinjaMenu.pdf',
} as const;

/** Tuesday to Sunday, 15:00 to 22:00; closed on Monday (the site's opening hours). Days: 0 is Sunday. */
export const OPEN_DAYS = [0, 2, 3, 4, 5, 6] as const;
export const OPENS = 15 * 60;
export const CLOSES = 22 * 60;

export const PARKING = [
  { name: 'Parking Steendok', address: 'Waalsekaai 69A', lat: 51.2073, lon: 4.3911 },
  { name: 'Parking Kooldok', address: 'Waalsekaai 1A', lat: 51.2104, lon: 4.3948 },
] as const;

/**
 * The house rules, as Ninja writes them on its menu: a small menu, everything made in the house during the day, no
 * sugars, preservatives or additives and only Himalayan salt, the meat on a vertical spit over an open oak-wood fire,
 * lavash from a traditional Turkish stone oven, fries in beef fat, and sourdough on purpose.
 */
export const PHILOSOPHY = [
  { kicker: 'Klein menu', text: 'Bij Ninja kiezen we bewust voor een klein, authentiek menu. Alles wat we serveren wordt de hele dag door vers gemaakt of gebakken in ons restaurant.' },
  { kicker: 'Niets toegevoegd', text: 'We gebruiken geen suikers, bewaarmiddelen, zout of andere toevoegingen, alleen Himalayazout. Alles is huisgemaakt, van het desembrood tot de dips.' },
  { kicker: 'Open eikenvuur', text: 'We grillen gemarineerd rundvlees met kalf en lam aan een verticale spies boven een open vuur van eikenhout. In een traditionele Turkse steenoven bakken we echte lavash, geserveerd met verse sla en frieten gebakken in rundvet.' },
  { kicker: 'Desem', text: 'We bakken bewust desembrood: het bevat meer B-vitamines, helpt mineralen beter op te nemen, houdt de bloedsuiker in toom en is goed voor de spijsvertering.' },
] as const;

/** The first lines of the site: what Ninja says it is. */
export const MANIFESTO =
  'Ninja is niet zomaar fastfood: het is een wereld waarin tradities tot leven komen. Geïnspireerd door de mystiek en het erfgoed van de ninja vieren we de kunst van de traditionele kebab en Turkse smaken met een eigentijdse twist. Een gastronomische ervaring in een snel tempo.';

/** The room as Le Fooding describes it: designed by Ruby Carmen. */
export const INTERIOR = [
  'Een modernistisch gebouw aan de Vlaamsekaai',
  'Wanden in hout, chromen stoelen en lederen banken',
  'Een bar in de vorm van een ruimteschip',
  'Een houtgestookte steenoven, overgebracht uit Istanbul',
] as const;

/** The FAQ, in the restaurant's own words (the Dutch answers where the site gives them). */
export const FAQ = [
  { question: 'Serveert Ninja halal?', answer: 'Ja.' },
  { question: 'Kan je een (groeps)reservatie maken?', answer: 'Helaas niet, je kan gewoon langskomen!' },
  { question: 'Welke sauzen kan ik krijgen bij mijn kebab?', answer: 'Yoghurt-knoflooksaus en ui-tomatensaus.' },
  { question: 'Waar kan ik parkeren?', answer: 'Parking Steendok (Waalsekaai 69A) en Parking Kooldok (Waalsekaai 1A).' },
  { question: 'Afhalen of cadeaubon?', answer: 'Kan helaas niet!' },
] as const;

export const SAUCES = ['Yoghurt-knoflooksaus', 'Ui-tomatensaus'] as const;

/** Ninja is always looking for students and flexi-workers (its jobs page). */
export const JOBS = {
  title: 'Studenten en flexi’s',
  text: 'Ninja is altijd op zoek naar vast personeel, gemotiveerde studenten en flexi’s. Bestellingen opnemen en klaarmaken, afrekenen, orde in de zaak, voorraad opvolgen. Goesting? Mail je cv en motivatie.',
} as const;
