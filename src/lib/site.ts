/**
 * Shared site constants and URL helpers.
 *
 * SITE_URL is the production canonical origin (GitHub Pages project site).
 * withBase() prefixes internal links with the configured Astro base path so
 * links and assets work both in local development (base "/") and in
 * production (base "/strip-tokens/").
 */

export const SITE_URL = 'https://mojekinokros.github.io/strip-tokens/';
export const SITE_NAME = 'Stripchat Tokens Guide';
export const SITE_TAGLINE = 'An independent educational resource';
export const SITE_LOCALE = 'en_US';
export const SITE_LANGUAGE = 'en';
export const CONTENT_REVIEWED = 'September 10, 2026';
export const CONTENT_REVIEWED_ISO = '2026-09-10';

/** Build an absolute canonical URL from a site-relative path. */
export function canonicalUrl(path: string): string {
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return SITE_URL + clean;
}

/** Prefix a site-relative path with the Astro base path. */
export function withBase(path: string): string {
  const base: string =
    (import.meta.env?.BASE_URL as string | undefined) ?? '/strip-tokens/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const clean = path.startsWith('/') ? path.slice(1) : path;
  return normalizedBase + clean;
}

export interface NavItem {
  href: string;
  label: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { href: '', label: 'Home' },
  { href: 'legal-ways-to-get-stripchat-tokens/', label: 'Legal Methods' },
  { href: 'stripchat-token-scams-and-safety/', label: 'Scams & Safety' },
  { href: 'stripchat-tokens-payment-faq/', label: 'Payment FAQ' },
];
