# AuditReady Landing Page — Design Brainstorm

<response>
<text>
**Design Movement:** Editorial Compliance — Warm Institutional

**Core Principles:**
1. Trustworthy warmth: the palette and typography signal "professional healthcare tool" without the cold sterility of hospital software
2. Asymmetric editorial layout: left-anchored content blocks with generous right-side whitespace, like a well-designed annual report
3. Serif authority: Fraunces (per brand brief) for headlines, Inter for body — the contrast signals intelligence and care
4. Density contrast: sparse hero, dense feature grid, sparse CTA — rhythm that guides the eye

**Color Philosophy:**
Deep teal (#1a3a3a) as primary authority color. Warm off-white (#faf8f4) background to feel like quality paper. Status colors only for credential states. No gradients. No purple. No blue SaaS.

**Layout Paradigm:**
Left-anchored hero with headline flush-left, not centered. Feature section uses a 2-column asymmetric split (large card + 2 small cards). Stats banner uses a ruled-line table aesthetic.

**Signature Elements:**
1. Thin teal horizontal rule used as section dividers (not full-width borders)
2. Small serif "eyebrow" labels in uppercase tracking above section headlines
3. Credential status dots (critical/warning/current) used as decorative accents in feature cards

**Interaction Philosophy:**
Minimal animation. Buttons scale 0.97 on press. Cards lift 2px on hover with a subtle shadow. No parallax, no scroll-triggered explosions.

**Animation:**
Entrance: staggered fade-up (opacity 0→1, translateY 12px→0) at 180ms ease-out, 60ms stagger per card. Button press: scale(0.97) at 120ms.

**Typography System:**
- Display: Fraunces 700, 48–64px, tight tracking (-0.02em)
- Section headline: Fraunces 600, 32px
- Body: Inter 400, 15px, 1.6 line-height
- Label/eyebrow: Inter 500, 11px, uppercase, 0.08em tracking
- Caption: Inter 400, 12px, muted
</text>
<probability>0.08</probability>
</response>

<response>
<text>
**Design Movement:** Clinical Modernism — Structured Grid

**Core Principles:**
1. Grid discipline: 12-column strict grid, every element snaps to it
2. Monochromatic with one accent: near-black, white, and a single teal accent — no secondary colors
3. Data-forward: tables and structured lists preferred over prose paragraphs
4. Compact density: less whitespace, more information per viewport

**Color Philosophy:**
Near-black (#0f1a1a) background for the hero, white content sections below. Single accent: #2dd4bf (teal-400). Status colors for credential states only.

**Layout Paradigm:**
Dark hero section, white content sections below. Feature section is a strict 3-column grid with numbered items. Stats are displayed as a data table.

**Signature Elements:**
1. Monospace numbers for stats (tabular figures)
2. Thin 1px teal accent lines on card left borders
3. Dark hero with white Fraunces headline

**Interaction Philosophy:**
Hover states reveal teal underlines on links. Cards show teal left-border on hover. No scale transforms.

**Animation:**
Minimal. Section fade-in on scroll at 200ms. No stagger.

**Typography System:**
- Display: Fraunces 700, 56px, white on dark
- Section: Fraunces 600, 28px, near-black
- Body: Inter 400, 14px
- Mono stats: JetBrains Mono 600, 32px
</text>
<probability>0.06</probability>
</response>

<response>
<text>
**Design Movement:** Warm Serif Editorial — chosen approach

**Core Principles:**
1. Serif-led hierarchy: Fraunces for all headlines, Inter for all body — the contrast is the brand
2. Warm paper background (#faf8f4) throughout — never pure white
3. Left-aligned hero: headline flush left, not centered — signals confidence, not a generic SaaS template
4. Section rhythm: alternating background (off-white / card-white) to create visual breathing room without borders

**Color Philosophy:**
Primary: deep teal #1a3a3a. Background: warm off-white #faf8f4. Card: pure white #ffffff. Muted text: #6b7280. Status critical: #7a1f1f on #fde8e8. Status warning: #7a4f1f on #fdf3e8. Status current: #2e3a3a on #e8f0f0. No gradients. No purple.

**Layout Paradigm:**
Left-anchored hero (headline and CTA left-aligned on desktop, centered on mobile). Feature section: 3-column card grid. Clinic types: 3-column card grid. Stats: centered 3-column banner. Testimonials: 3-column card grid. CTA band: full-width teal background.

**Signature Elements:**
1. Uppercase 11px Inter eyebrow labels above every section headline
2. CheckCircle2 icons in teal for credential lists (not bullet points)
3. Teal CTA band at bottom with white headline and dual buttons

**Interaction Philosophy:**
Cards lift on hover (shadow + 2px translateY). Buttons scale 0.97 on press. All transitions 150ms ease-out.

**Animation:**
Staggered card entrance: opacity 0→1, translateY 16px→0, 200ms ease-out, 50ms stagger. Hero headline: no animation (instant). CTA button: scale(0.97) on active.

**Typography System:**
- Display: Fraunces 700, 48px desktop / 36px mobile
- Section headline: Fraunces 600, 30px
- Card title: Inter 500, 14px
- Body: Inter 400, 15px, leading-relaxed
- Eyebrow: Inter 500, 11px, uppercase, tracking-widest
- Caption: Inter 400, 12px, muted-foreground
</text>
<probability>0.09</probability>
</response>

## Selected Approach: Warm Serif Editorial

Choosing the third approach. Left-aligned hero, Fraunces serif headlines, warm off-white background, deep teal primary, CheckCircle2 credential lists, staggered card entrance animations, teal CTA band.
