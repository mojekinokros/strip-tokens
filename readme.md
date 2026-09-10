# Stripchat Tokens Guide (independent educational website)

An independent, educational, conversion-focused static website about **legal ways
to get, buy, use, and manage Stripchat Tokens** — plus scam prevention and
payment troubleshooting. Not affiliated with, sponsored by, endorsed by, or
officially connected with Stripchat.

**Production URL:** https://mojekinokros.github.io/strip-tokens/

## Stack

- [Astro 5](https://astro.build) with static output (`output: static`, `format: directory`, `trailingSlash: always`)
- TypeScript (strict base config)
- Hand-written modular CSS (no framework, no runtime JS except a tiny mobile-nav toggle)
- Zero-dependency custom audit script (`scripts/audit.mjs`) for SEO / links / a11y checks

## Pages

| URL | Source |
| --- | --- |
| `/` | `src/pages/index.astro` |
| `/legal-ways-to-get-stripchat-tokens/` | `src/pages/legal-ways-to-get-stripchat-tokens/index.astro` |
| `/stripchat-token-scams-and-safety/` | `src/pages/stripchat-token-scams-and-safety/index.astro` |
| `/stripchat-tokens-payment-faq/` | `src/pages/stripchat-tokens-payment-faq/index.astro` |
| `/privacy-policy/`, `/terms/`, `/disclaimer/` | `src/pages/*/index.astro` (concise templates — review before treating as final) |
| `404.html` | `src/pages/404.astro` |

SEO infrastructure: `public/robots.txt`, `public/sitemap.xml`, canonical tags,
Open Graph + Twitter cards, JSON-LD (WebSite, Article, BreadcrumbList, FAQPage).

## Development

```bash
npm install
npm run dev      # local server at http://localhost:4321/ (base "/" in dev)
npm run build    # production build with base "/strip-tokens/" into dist/
npm run preview  # serve the production build locally
npm run typecheck
npm run lint     # audits dist/ (run build first)
npm run check    # typecheck + lint
```

The Astro `base` is `/strip-tokens/` in production (GitHub Pages project site)
and `/` in local dev (`ASTRO_BASE=/`). Internal links use the `withBase()`
helper so both environments work.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which typechecks,
builds, audits, and deploys `dist/` to GitHub Pages. Requirements in the repo
settings: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

## Google Search Console checklist (manual, after first deploy)

1. Add the property `https://mojekinokros.github.io/strip-tokens/` and verify it.
2. Submit `sitemap.xml`.
3. Inspect the homepage + 3 guides and request indexing where available.
4. Monitor coverage, canonical, and mobile-usability reports.
