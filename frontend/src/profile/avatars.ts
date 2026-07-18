// The two "pick" sources for the profile icon: a curated emoji set and a set of bundled preset
// avatars. Presets are hand-authored inline SVGs encoded as `data:` URIs — self-contained, so they
// need no network request and satisfy the app's strict `connect-src 'self'` CSP. Emojis are stored
// as their raw character; presets are stored by id (see PRESET_AVATARS[].id).

export const EMOJIS: string[] = [
  "🦊", "🐼", "🐸", "🐙", "🦄", "🐝", "🐢", "🦁", "🐨", "🐵",
  "🐶", "🐱", "🦉", "🐧", "🐳", "🦖", "🦋", "🐬", "🐷", "🐴",
  "🎲", "🃏", "🏆", "⚡", "🚀", "🔥", "🌟", "🍀", "🎯", "👑",
];

// --- Preset avatars ---------------------------------------------------------------------------
// A shared friendly face keeps the set cohesive; a distinct gradient + one accessory gives each its
// own personality. viewBox is 100x100 and fully filled — MUI's <Avatar> clips it to a circle.

const FEATURE = "#26264a";

function face(extra = ""): string {
  return `
    <circle cx="38" cy="47" r="5" fill="${FEATURE}"/>
    <circle cx="62" cy="47" r="5" fill="${FEATURE}"/>
    <path d="M37 62 Q50 74 63 62" stroke="${FEATURE}" stroke-width="5" fill="none" stroke-linecap="round"/>
    ${extra}`;
}

// Accessories replace/augment the base face where noted.
const ACCESSORY: Record<string, string> = {
  plain: face(),
  glasses: `
    <circle cx="38" cy="47" r="9" fill="none" stroke="${FEATURE}" stroke-width="3"/>
    <circle cx="62" cy="47" r="9" fill="none" stroke="${FEATURE}" stroke-width="3"/>
    <line x1="47" y1="47" x2="53" y2="47" stroke="${FEATURE}" stroke-width="3"/>
    <circle cx="38" cy="47" r="4" fill="${FEATURE}"/>
    <circle cx="62" cy="47" r="4" fill="${FEATURE}"/>
    <path d="M37 62 Q50 74 63 62" stroke="${FEATURE}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  cheeks: face(`
    <circle cx="29" cy="58" r="6" fill="#ff7a9c" opacity="0.7"/>
    <circle cx="71" cy="58" r="6" fill="#ff7a9c" opacity="0.7"/>`),
  cat: `
    <path d="M22 8 L34 30 L14 28 Z" fill="#ffffff" opacity="0.55"/>
    <path d="M78 8 L66 30 L86 28 Z" fill="#ffffff" opacity="0.55"/>
    ${face(`
      <line x1="16" y1="52" x2="30" y2="54" stroke="${FEATURE}" stroke-width="2"/>
      <line x1="16" y1="58" x2="30" y2="58" stroke="${FEATURE}" stroke-width="2"/>
      <line x1="84" y1="52" x2="70" y2="54" stroke="${FEATURE}" stroke-width="2"/>
      <line x1="84" y1="58" x2="70" y2="58" stroke="${FEATURE}" stroke-width="2"/>`)}`,
  crown: `
    <path d="M32 22 L40 32 L50 20 L60 32 L68 22 L66 40 L34 40 Z" fill="#ffd54a" stroke="#e0a300" stroke-width="1.5"/>
    ${face()}`,
  wink: `
    <path d="M32 47 Q38 42 44 47" stroke="${FEATURE}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <circle cx="62" cy="47" r="5" fill="${FEATURE}"/>
    <path d="M37 62 Q50 74 63 62" stroke="${FEATURE}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  shades: `
    <rect x="26" y="40" width="20" height="13" rx="4" fill="${FEATURE}"/>
    <rect x="54" y="40" width="20" height="13" rx="4" fill="${FEATURE}"/>
    <line x1="46" y1="45" x2="54" y2="45" stroke="${FEATURE}" stroke-width="3"/>
    <path d="M37 63 Q50 72 63 63" stroke="${FEATURE}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  party: `
    <path d="M50 4 L64 30 L36 30 Z" fill="#ff5da2" stroke="#ffffff" stroke-width="1.5"/>
    <circle cx="50" cy="4" r="3" fill="#ffe14a"/>
    <circle cx="20" cy="20" r="2.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="82" cy="26" r="2.5" fill="#ffffff" opacity="0.8"/>
    <circle cx="78" cy="70" r="2.5" fill="#ffffff" opacity="0.7"/>
    ${face()}`,
};

type PresetSpec = { id: string; from: string; to: string; accessory: keyof typeof ACCESSORY };

const PRESET_SPECS: PresetSpec[] = [
  { id: "blossom", from: "#ff9a9e", to: "#fecfef", accessory: "plain" },
  { id: "ocean", from: "#4facfe", to: "#00f2fe", accessory: "glasses" },
  { id: "sunset", from: "#fa709a", to: "#fee140", accessory: "cheeks" },
  { id: "meadow", from: "#43e97b", to: "#38f9d7", accessory: "cat" },
  { id: "royal", from: "#667eea", to: "#764ba2", accessory: "crown" },
  { id: "grape", from: "#a18cd1", to: "#fbc2eb", accessory: "wink" },
  { id: "midnight", from: "#5ee7df", to: "#4b3f9e", accessory: "shades" },
  { id: "carnival", from: "#ff8008", to: "#ee0979", accessory: "party" },
];

function buildSvg(spec: PresetSpec): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${spec.from}"/><stop offset="1" stop-color="${spec.to}"/>
    </linearGradient></defs>
    <rect width="100" height="100" fill="url(#g)"/>
    ${ACCESSORY[spec.accessory]}
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

export type PresetAvatar = { id: string; url: string };

export const PRESET_AVATARS: PresetAvatar[] = PRESET_SPECS.map((s) => ({
  id: s.id,
  url: buildSvg(s),
}));

export const PRESET_BY_ID: Record<string, string> = Object.fromEntries(
  PRESET_AVATARS.map((p) => [p.id, p.url]),
);
