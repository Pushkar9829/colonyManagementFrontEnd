// White-label branding: a reseller's colour replaces the brand palette through CSS variables (Tailwind v4
// utilities such as bg-brand-600 read --color-brand-600), so no component needs to know about resellers.
const SHADES = {
  '--color-brand-50': (c) => `color-mix(in srgb, ${c} 8%, white)`,
  '--color-brand-100': (c) => `color-mix(in srgb, ${c} 18%, white)`,
  '--color-brand-500': (c) => `color-mix(in srgb, ${c} 82%, white)`,
  '--color-brand-600': (c) => c,
  '--color-brand-700': (c) => `color-mix(in srgb, ${c} 82%, black)`,
};
const HEX = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_APP_NAME = 'ColonyHub';

export function applyBrandColour(colour, root = document.documentElement) {
  for (const [name, shade] of Object.entries(SHADES)) {
    if (colour && HEX.test(colour)) root.style.setProperty(name, shade(colour));
    else root.style.removeProperty(name);
  }
}

// ?brand=<slug> on the login / register links a partner hands out; the custom domain host otherwise.
export function brandQuery(location = window.location) {
  const slug = new URLSearchParams(location.search).get('brand') || undefined;
  return { slug, host: location.hostname };
}

export const appNameOf = (brand) => (brand?.reseller && brand.appName) || DEFAULT_APP_NAME;
