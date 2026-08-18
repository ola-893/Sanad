# Sanad Protocol — UI Design Direction (Flux)

**Status:** Governing direction for the full-product redesign (marketing + all portals)
**Reference:** The **Flux** design system (warm editorial luxury DeFi) — `/Users/deonorla/Documents/Github/Flux`
**Date:** August 2026 (v3 — supersedes Midnight & Copper and the deep-green/gold editorial direction)

---

## 1. Visual thesis

Sanad is a **Shariah-compliant gold-backed credit network** — a vault you can verify. The design language is **Flux**: warm, light, editorial luxury. It reads as *a polished financial instrument on warm paper, with one rose accent that glows where value moves.*

One sentence: **"Warm paper, near-black ink, one rose light."**

- **Warm off-white** (`#F5F5F3`) is the ground — light-first, always. No dark theme.
- **Near-black ink** (`#171414`) is the text, the CTAs, the structure.
- **Dusty rose** (`#E1BAC2`) is the single accent — dark pills' text, hover states, selection, glows, status dots.
- **Frosted glass** everywhere: `bg-white/55–60` panels with `backdrop-blur` and hairline borders.
- **Pills, not boxes** — the header, nav, CTAs, section tags, badges are all `rounded-full`.
- **Mono micro-labels** (`10px`, uppercase, `0.2em` tracking) carry all technical framing.
- Motion is a quiet, confident scroll — centered reveals, a sticky scroll-driven story sequence, `ease [0.16, 1, 0.3, 1]`.

Rejected: dark-first themes, the green/gold palette, the copper/midnight palette, hard box shadows, rainbow data-viz.

## 2. Typography system

| Role | Font | Usage |
|---|---|---|
| Display / headlines | **Manrope** (600–800) | H1–H3, section titles, big numbers. Heavy, confident, tight tracking. |
| Body / UI | **Hanken Grotesk** | Paragraphs, forms, tables, buttons, body copy. |
| Technical labels | **JetBrains Mono** | Kickers, LTV/bps/chain IDs, timestamps, status codes, section tags. |

Rules:
- Headlines: `font-display`, `font-extrabold`, tight leading (1.05), negative tracking. The Flux headline pattern is **line one in ink, second line in muted gray** (`#4A4A4A`).
- Kickers above headlines: mono, uppercase, wide tracking, often inside a **pill tag** (`THE PROBLEM` / `HOW IT WORKS`).
- Numeric data: mono with `tabular-nums`.
- Nav links: mono-ish uppercase pill links with an active white-pill indicator.

## 3. Color system (light-first)

### Primitives
| Token | Value | Role |
|---|---|---|
| Flux ground | `#F5F5F3` | Page background — warm off-white |
| Flux soft | `#FAFAF8` | Soft surfaces, card tint |
| Ink | `#171414` | Foreground, primary CTA, dark sections, footer |
| Secondary ink | `#4A4A4A` | Muted text, secondary headline lines |
| Rose neon | `#E1BAC2` | The accent — dark-pill text, hover, selection, glows |
| Rose soft | `#F2CBD3` | Rose fills / tints |
| Hairline | `rgba(23,20,20,0.12)` | Borders, dividers |
| Footer dark | `#111010` | Dark footer ground |

### Semantic tokens (light `:root`; `.dark` kept as an ink variant so the toggle doesn't break)
- `background`: `hsl 60 8% 96%` (#F5F5F3)
- `card`: `hsl 60 14% 98%` (#FAFAF8)
- `foreground`: `hsl 0 7% 9%` (#171414)
- `primary` (ink CTA pill): `hsl 0 7% 9%`, `primary-foreground`: rose `hsl 348 39% 81%`
- `accent` (rose): `hsl 348 39% 81%`, `accent-foreground`: ink
- `muted`/`secondary`: light warm grays; `muted-foreground`: `#4A4A4A`
- `border`: `hsl 40 8% 88%` hairline
- `ring`: rose; `success`/`warning`/`destructive`: standard light-theme greens/ambers/reds
- charts: rose, rose-soft, warm gray, green, amber
- sidebar: light ground with ink active states, rose accents

### Legacy brand aliases (re-mapped, kept for compatibility)
`deepGreen → #171414` (ink) · `gold → #E1BAC2` (rose) · `brightGold → #F2CBD3` (rose soft) · `ivory → #F5F5F3` (warm white) · `darkOlive → #4A4A4A` (muted) · `softBeige → #FAFAF8` (light card tint)

## 4. Layout & grid

- Max-width `7xl` sections; **frosted glass panels** (`glass-panel`: `bg-white/60` + blur + hairline border) with `rounded-2xl`/`rounded-3xl` corners — Flux's `shadow-soft-editorial` instead of hard shadows.
- Header: a **floating frosted pill** (`rounded-full border-white/45 bg-white/55 backdrop-blur-xl`) containing a dark logo pill, a pill nav with a white active indicator, and a dark `Apply` pill CTA.
- Marketing: centered section headers (pill tag + two-line Manrope headline), glass card grids, divided metric rows.
- Product: dense tables, mono tabular numerals, light surfaces, sidebar with rose active states.

## 5. Component language

- **Buttons/CTAs:** dark ink pill with rose text (`.flux-pill`); secondary = white/75 pill with hairline border, rose glow on hover. On dark bands, the inverse (rose pill with ink text).
- **Cards:** `glass-panel` (frosted white, hairline border, soft shadow), hover = brighter white + lifted.
- **Badges/status:** mono, small, uppercase pills; risk semantics via success/warning/destructive.
- **Section tags:** centered pill (`THE PROBLEM`) with a rose diamond dot.
- **Tables:** hairline rows on frosted panels, mono micro-label headers.
- **Logo:** dark circular seal with a rose diamond + soft rose glow; wordmark in Manrope extrabold with a rose mono `PROTOCOL` kicker.
- **Footer:** dark `#111010`-family with mono white column headers, rose hover links, and a giant `SANAD` watermark.

## 6. Motion narrative

- Defaults: controls 160–220ms; section entrances 500–760ms, `ease [0.16, 1, 0.3, 1]`; `prefers-reduced-motion` settles immediately.
- Landing hero: **intro screen** (seal with rotating rings + rose breathing glow, headline, scroll hint) → **sticky scroll-driven story sequence** (`Pledged → Appraised → Tokenized → Funded → Settled`) with converging hairlines, a center word, a mono frame counter, a rose progress bar, and CTAs that appear at the end — all hand-rolled (no animation library).
- Product: no entrance choreography — micro-interactions only (pill states, row hovers, progress fills).
- Rose glow is a state signal (active, hover, selection), never ambient noise.

## 7. Scope (whole product)

1. Foundation (tokens, fonts, chrome, components) — done.
2. Marketing (home + scroll story, how-it-works, ar-rahnu-industry, about, shariah, security, faq, contact, legal, auth) — done (token-driven).
3. Borrower (apply flow, dashboard), pawnshop, investor, admin portals — done (token-driven).

## 8. Remaining cleanup (flagged)

- Residual `dark:`-prefixed legacy color variants in deep admin pages (dormant under the light default).
- Mock data and placeholder images across dashboards.
- "Hedera" copy remnants in deep components.
- Portal pages still carry generic shadcn structure — a future pass could glass-panel them like the marketing pages.

## 9. Acceptance bar

- Light-first everywhere: warm `#F5F5F3` ground, no stray dark cards, no orphaned `bg-white`/`text-white`/emerald/copper classes.
- One coherent rose accent; ink pills for every primary CTA; data legible in mono.
- Full keyboard focus, visible rings, reduced-motion respected, contrast AA on body text.
- `tsc --noEmit` clean; `next build` passes.
