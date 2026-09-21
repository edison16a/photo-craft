/**
 * Font catalog for the text tool.
 *
 * Two kinds of fonts live here. System fonts are the ones nearly every
 * machine ships with, so they need no download. Google fonts are fetched on
 * demand by src/lib/font-loader.ts. Everything is plain data so the picker
 * can render it right away and tests can check it without setup.
 */

/** Broad style group a font belongs to. Drives the tabs in the font picker. */
export type FontCategory =
  | "sans-serif"
  | "serif"
  | "display"
  | "handwriting"
  | "monospace";

/** One font the user can pick for a text element. */
export interface FontOption {
  /** Exact family name as CSS and Google Fonts know it. */
  family: string;
  category: FontCategory;
  /** Where the font comes from. Google fonts need a stylesheet download. */
  source: "system" | "google";
}

/** Categories in the order the picker shows them, each with a label. */
export const FONT_CATEGORIES: { id: FontCategory; label: string }[] = [
  { id: "sans-serif", label: "Sans serif" },
  { id: "serif", label: "Serif" },
  { id: "display", label: "Display" },
  { id: "handwriting", label: "Handwriting" },
  { id: "monospace", label: "Monospace" },
];

/** Fonts that need no download. Kept per category so they sort with the rest. */
const SYSTEM_FAMILIES: Record<FontCategory, string> = {
  "sans-serif": "Arial, Helvetica, Tahoma, Trebuchet MS, Verdana",
  serif: "Garamond, Georgia, Times New Roman",
  display: "Impact",
  handwriting: "",
  monospace: "Courier New",
};

/**
 * Google Fonts families, comma separated to keep the file short. Only names
 * that exist on fonts.google.com belong here, spelled exactly as listed there.
 */
const GOOGLE_FAMILIES: Record<FontCategory, string> = {
  "sans-serif": `
    Archivo, Archivo Narrow, Arimo, Asap, Assistant, Barlow, Barlow Condensed,
    Be Vietnam Pro, Cabin, Cairo, Catamaran, Chivo, DM Sans, Dosis, Encode Sans,
    Exo 2, Figtree, Fira Sans, Heebo, Hind, IBM Plex Sans, Inter, Josefin Sans,
    Jost, Kanit, Karla, Lato, Lexend, Libre Franklin, Manrope, Maven Pro,
    Montserrat, Mukta, Mulish, Noto Sans, Nunito, Nunito Sans, Open Sans, Oswald,
    Outfit, Overpass, Oxygen, Plus Jakarta Sans, Poppins, Prompt, PT Sans,
    Public Sans, Questrial, Quicksand, Raleway, Red Hat Display, Roboto,
    Roboto Condensed, Rubik, Saira, Sarabun, Signika, Sora, Source Sans 3,
    Space Grotesk, Tajawal, Titillium Web, Ubuntu, Urbanist, Varela Round,
    Work Sans, Yantramanav`,
  serif: `
    Alegreya, Amiri, Arvo, Bitter, Bodoni Moda, Cardo, Cormorant,
    Cormorant Garamond, Crete Round, Crimson Pro, Crimson Text, DM Serif Display,
    DM Serif Text, Domine, EB Garamond, Frank Ruhl Libre, Fraunces, Gelasio,
    IBM Plex Serif, Josefin Slab, Kreon, Libre Baskerville, Libre Caslon Text,
    Literata, Lora, Merriweather, Neuton, Newsreader, Noticia Text, Noto Serif,
    Old Standard TT, Playfair Display, Prata, PT Serif, Quattrocento,
    Roboto Serif, Roboto Slab, Rokkitt, Sorts Mill Goudy, Source Serif 4,
    Spectral, Tinos, Unna, Vollkorn, Zilla Slab`,
  display: `
    Abril Fatface, Alfa Slab One, Anton, Archivo Black, Audiowide, Baloo 2,
    Bangers, Bebas Neue, Black Ops One, Boogaloo, Bowlby One, Bungee,
    Bungee Shade, Carter One, Changa One, Chewy, Cinzel, Comfortaa, Concert One,
    Creepster, Days One, Fjalla One, Fredoka, Fugaz One, Graduate, Lilita One,
    Limelight, Lobster, Lobster Two, Luckiest Guy, Monoton, Orbitron,
    Passion One, Patua One, Paytone One, Press Start 2P, Racing Sans One,
    Righteous, Rubik Mono One, Russo One, Rye, Secular One, Shrikhand,
    Sigmar One, Silkscreen, Sniglet, Special Elite, Squada One, Staatliches,
    Teko, Titan One, Ultra, Unica One, Vast Shadow, Yeseva One, Zen Dots`,
  handwriting: `
    Alex Brush, Allura, Amatic SC, Architects Daughter, Bad Script, Caveat,
    Cedarville Cursive, Cookie, Courgette, Covered By Your Grace, Damion,
    Dancing Script, Gloria Hallelujah, Grand Hotel, Great Vibes, Handlee,
    Homemade Apple, Indie Flower, Italianno, Just Another Hand, Kalam,
    Kaushan Script, Kristi, La Belle Aurore, Leckerli One, Marck Script,
    Merienda, Mr Dafoe, Neucha, Nothing You Could Do, Pacifico, Parisienne,
    Patrick Hand, Permanent Marker, Pinyon Script, Playball, Rancho,
    Reenie Beanie, Rock Salt, Rouge Script, Sacramento, Satisfy, Schoolbell,
    Shadows Into Light, Short Stack, Sriracha, Tangerine, Yellowtail,
    Yesteryear, Zeyada`,
  monospace: `
    Anonymous Pro, Azeret Mono, B612 Mono, Chivo Mono, Courier Prime, Cousine,
    Cutive Mono, DM Mono, Fira Code, Fira Mono, IBM Plex Mono, Inconsolata,
    JetBrains Mono, Major Mono Display, Martian Mono, Nova Mono, Noto Sans Mono,
    Overpass Mono, Oxygen Mono, PT Mono, Red Hat Mono, Roboto Mono,
    Share Tech Mono, Source Code Pro, Space Mono, Spline Sans Mono, Syne Mono,
    Ubuntu Mono, VT323, Xanh Mono`,
};

/** Splits one of the comma separated blocks above into clean family names. */
function splitFamilies(block: string): string[] {
  return block
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
}

/** Builds the options for one category, system and Google fonts together, A to Z. */
function optionsFor(category: FontCategory): FontOption[] {
  const system = splitFamilies(SYSTEM_FAMILIES[category]).map(
    (family): FontOption => ({ family, category, source: "system" }),
  );
  const google = splitFamilies(GOOGLE_FAMILIES[category]).map(
    (family): FontOption => ({ family, category, source: "google" }),
  );
  return [...system, ...google].sort((a, b) =>
    a.family.localeCompare(b.family),
  );
}

/**
 * Every font the picker offers, grouped in FONT_CATEGORIES order and sorted
 * alphabetically inside each group. Ten system fonts plus a long list of
 * Google fonts.
 */
export const FONTS: FontOption[] = FONT_CATEGORIES.flatMap((category) =>
  optionsFor(category.id),
);

/** Lookup table keyed by lowercase family so findFont stays cheap. */
const FONT_INDEX = new Map<string, FontOption>(
  FONTS.map((font) => [font.family.toLowerCase(), font]),
);

/**
 * Looks a font up by family name. Matching ignores case and surrounding
 * whitespace, so "roboto" finds Roboto. Unknown names give undefined.
 */
export function findFont(family: string): FontOption | undefined {
  return FONT_INDEX.get(family.trim().toLowerCase());
}

/** Weight and style axes we ask Google for: regular and bold, upright and italic. */
const GOOGLE_AXES = "ital,wght@0,400;0,700;1,400;1,700";

/** Encodes a family for the css2 endpoint, which wants spaces as plus signs. */
function encodeFamily(family: string): string {
  return encodeURIComponent(family).replace(/%20/g, "+");
}

/**
 * Builds the Google Fonts css2 stylesheet URL for the given families.
 * Each family gets the regular, bold, italic and bold italic faces and the
 * sheet uses display swap so text shows in a fallback font while it loads.
 * Blank names and repeats are dropped. With no families left the URL only
 * carries display=swap, so check the input before fetching it.
 */
export function googleFontsCssUrl(families: string[]): string {
  const unique = Array.from(
    new Set(families.map((name) => name.trim()).filter((name) => name)),
  );
  const params = unique.map(
    (family) => `family=${encodeFamily(family)}:${GOOGLE_AXES}`,
  );
  params.push("display=swap");
  return `https://fonts.googleapis.com/css2?${params.join("&")}`;
}
