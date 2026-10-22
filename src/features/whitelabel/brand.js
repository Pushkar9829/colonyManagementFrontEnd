// White-label branding: a reseller's colour replaces the brand palette through the template variables
// (--tpl-brand-*, read by Tailwind's brand-* utilities in index.css), so no component needs to know about
// resellers. Used by the partner's own console; colonies get partner colours through their app template.
const SHARE = { 50: 7, 100: 15, 200: 30, 300: 48, 400: 68, 500: 86, 700: 84, 800: 70, 900: 58, 950: 36 };
const SHADES = {
  ...Object.fromEntries(Object.entries(SHARE).map(([s, n]) => [`--tpl-brand-${s}`, (c) => `color-mix(in srgb, ${c} ${n}%, ${Number(s) < 600 ? 'white' : 'black'})`])),
  '--tpl-brand-600': (c) => c,
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
