# dbrown-io.github.io

Static personal site for David Brown: local services near Richmond, plus
experience, projects and a photography gallery. No build step, no
framework. Plain HTML with one shared `styles.css` and one `nav.js`.

## Layout

- `index.html` splits two audiences: locals booking a job, and people
  assessing him professionally. Both routes live under the H1.
- `styles.css` is the single stylesheet. Bump the `?v=N` query on every
  page when changing it, or browsers serve the old file.
- Colour tokens are contrast-checked. `--ink-dim` and `--ink-faint` are
  text colours meeting WCAG AA against both `--paper` and `--card`;
  `--dot` is background texture only and must never be used for text.
- `nav.js` slides the tab indicator. The indicator is hidden below 480px,
  where the nav becomes a 2x2 grid, so the active tab paints its own
  background there.

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
