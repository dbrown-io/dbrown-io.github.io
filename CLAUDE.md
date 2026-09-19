# dbrown-io.github.io

Static personal site for David Brown: local services near Richmond, plus
experience, projects and a photography gallery. No build step, no
framework. Plain HTML with one shared `styles.css` and three small scripts:
`nav.js`, `contact.js` and `gallery.js` (photography only).

## Layout

- `index.html` splits two audiences: locals booking a job, and people
  assessing him professionally. Both routes live under the H1.
- `styles.css` is the single stylesheet. Bump the `?v=N` query on every
  page when changing it, or browsers serve the old file. The same applies to
  `nav.js`, `contact.js` and `gallery.js`: a stale cached script is harder to
  spot than stale CSS, because the page still looks right.
- `services.html` is the only page with the booking form. Everything else
  links to `services.html#book`, so there is one form to maintain.
- The contact block is worded per page: a recruiter reading Experience and
  a neighbour reading Services are not being asked the same thing.
- Colour tokens are contrast-checked. `--ink-dim` and `--ink-faint` are
  text colours meeting WCAG AA against both `--paper` and `--card`;
  `--dot` is background texture only and must never be used for text.
- `--line` is a decorative edge at 1.40:1 and must never bound a control.
  Anything a user has to find, a form field or a button outline, uses
  `--line-strong` (3.68:1 on `--card`, 3.26:1 on `--paper`).
- `nav.js` slides the tab indicator. The indicator is hidden below 480px,
  where the nav becomes a 2x2 grid, so the active tab paints its own
  background there.

## The booking form

The formspree endpoint is the form's own `action` in `services.html`, which
doubles as the fallback when JS is off: without it the submit would do
nothing. `contact.js` reads that attribute rather than keeping a second copy.
If the action is ever empty the form says so and points at Instagram instead
of pretending to send.

Spam is handled by the `_gotcha` honeypot, not reCAPTCHA. reCAPTCHA expects a
widget on the page and silently fails an AJAX submit, so leave it off in the
formspree dashboard.

The email `dbrown.io@icloud.com` lives in `contact.js` and in the JSON-LD in
both `index.html` and `services.html`, so a change needs making in all three.

Do not publish a phone number. See `.claude/review-002-2026-09-19.md`.

## Content that must stay real

Prices, grades, view counts and testimonials are all either real or absent.

No published rates, by David's decision on 2026-09-19: price depends on
timing and other factors, so every ticket says "Quote first" and the Services
page says why. Do not add a headline rate without David asking.

The Year 10 mock grades are stated plainly, with no parenthetical arguing that
one of them was nearly higher. The KidsHustle entry links one real video
rather than claiming a view count. There is no testimonials section because
there are no real testimonials yet.

## Images

Compress before committing: max 1600px on the long edge, WebP quality 82,
all EXIF stripped. Phone photos carry GPS, so strip it before the first
commit, not after: once committed it stays in history.

## Style direction (settled, do not "fix")

The paper ground, dot grid, tape swatches, Caveat signature and the
Inter / Space Grotesk / IBM Plex Mono set are deliberate. David reviewed
them on 2026-09-19 and kept them.

antislop flags several as Purpose-Gate findings (R-06 typography, R-07
dot background, R-08 arrows, R-12 shadow, R-14 card uniformity, R-19
fadeUp). Those rules ask for a written reason, not removal: this section
is that reason. Do not strip the identity to satisfy them. If a change
here looks warranted, raise it and let David decide.

The Experience page used to be a LinkedIn profile clone (banner, round
avatar, headline, section rows). That was R-30, cloning a popular product,
and it was not part of the settled direction. David chose to rebuild it, so
it now uses the same tape-and-card vocabulary as the service tickets. Do not
reintroduce it.

<!-- antislop:start -->
## antislop
For UI, copy, people, mobile layout, or code comments work, read `.claude/skills/antislop/SKILL.md` (core) and then the skill for the task:
- UI / visual: `.claude/skills/antislop-ui/SKILL.md`
- Copy & text: `.claude/skills/antislop-copywriting/SKILL.md`
- People: `.claude/skills/antislop-human/SKILL.md`
- Mobile / responsive: `.claude/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `.claude/skills/antislop-code/SKILL.md`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->
