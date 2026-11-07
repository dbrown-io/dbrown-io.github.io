# dbrown-io.github.io

Static personal site for David Brown: local services near Richmond, plus
experience, projects and a photography gallery. No build step, no
framework. Plain HTML with one shared `styles.css` and five small scripts:
`nav.js`, `motion.js`, `contact.js`, and `gallery.js` and `desk.js`
(photography only), plus a one-line inline script in each page's head
(see Motion). Experience also loads `scene3d.js` as a module, which
fetches three.js and `scenes/homelab.js` only when the model is near (see
3D models).

## Layout

- `index.html` splits two audiences: locals booking a job, and people
  assessing him professionally. Both routes live under the H1.
- `styles.css` is the single stylesheet. Bump the `?v=N` query on every
  page when changing it, or browsers serve the old file. The same applies to
  `nav.js`, `motion.js`, `contact.js`, `gallery.js` and `desk.js`: a stale
  cached script is harder to spot than stale CSS, because the page still
  looks right.
- `services.html` is the only page with the booking form. Everything else
  links to `services.html#book`, so there is one form to maintain. A link can
  pick the job in advance with `?job=<key>`, where the key is an option's
  `data-job` in the form (the service tickets do this, and Experience uses
  `?job=work`). Keep a ticket's key and its option's `data-job` in step.
- The contact block is worded per page: a recruiter reading Experience and
  a neighbour reading Services are not being asked the same thing.
- Colour tokens are contrast-checked. `--ink-dim` and `--ink-faint` are
  text colours meeting WCAG AA against both `--paper` and `--card`;
  `--dot` is background texture only and must never be used for text.
- `--line` is a decorative edge at 1.40:1 and must never bound a control.
  Anything a user has to find, a form field or a button outline, uses
  `--line-strong` (3.68:1 on `--card`, 3.26:1 on `--paper`).
- `nav.js` slides the tab indicator. The nav stays one row at every width;
  below 480px the tabs share it evenly at a 44px minimum height, and the
  indicator still runs there. The active tab only paints its own background
  when JS is off.

## Motion

Cards are paper, so they arrive like paper: the `land` keyframes in
`styles.css` drop each ticket, route card, Experience record, project card,
contact block and the Services facts in from slightly above, tilted, and
settle them flat. Neighbours alternate their angle (`--tilt`) so a row never
lands in step. Cards already on screen land on load from CSS alone, so they
show with JS off. `motion.js` holds back the cards that start below the fold
(`.land-wait`) and lands them as they are scrolled to.

Each card's tape is pressed on just after the card lands (`tape-press`):
it arrives lifted and crooked and squashes flat. Landing delays live in
`--land-delay` (set inline on the tickets, on `.route:nth-child(2)`, and by
`motion.js` for cards landing on scroll) so the tape can follow its own card.
Set a card's delay through `--land-delay`, never `animation-delay`.

Hover lifts a card 3px with a half-degree lean (`--lean`) and peels its tape.
That uses the `translate` and `rotate` properties, not `transform`, because
the landing animation's fill holds `transform` and would cancel it.

The taped profile photo in every header can be grabbed and flicked
(`motion.js`); it springs back onto its tape. The Instagram link under it is
not part of the grab.

Some motion is tied to scroll position rather than played once, so it runs
backwards when scrolling up. `motion.js` sets `--p` from 0 to 1 on the
element and the CSS reads it, treating a missing `--p` as 1, the finished
state. That is what shows with JS off or reduced motion on:

- Section label rules draw across from the label as they scroll in.
- Intro paragraphs (`.home-intro`) ink in word by word, from `--ink-faint`
  to `--ink`. The start colour passes AA, so the line is readable at every
  point; do not start it any paler.
- Experience wraps its sections in `.timeline`: a stitched terracotta
  thread down the left draws itself to a reading line 60% down the screen,
  and each section label's dot fills as the thread reaches it
  (`.is-pending` until then).
- The KidsHustle screenshots on Experience start stacked in the middle,
  fanned like a hand of cards, and spread into a row (two by two on a
  phone) big enough to read. `--cx`/`--cy` are each screen's distance from
  the middle in grid slots.

Reduced motion turns all of it off. Text keeps the quieter `fadeUp`: it is
not paper.

Some motion answers something the visitor just did:

- The nav pill stretches to a clicked tab: the edge on the side it is heading
  leads and the other follows, so it moves like a drop. It is one full-width
  element clipped between `--tab-l` and `--tab-r` (registered with
  `@property`), so it animates paint rather than `left`/`width`.
- Buttons press in and pop back when let go.
- A project on About unfolds (`::details-content` height) and its text
  settles in behind it. `*` does not reach that pseudo-element, so the
  reduced-motion block names it.
- Each new booking form message (sending, sent, failed) arrives rather than
  swapping in place. Disabling the focused submit button drops focus to the
  page, so `contact.js` hands it back afterwards.

- Moving between pages is a cross-document view transition. The signature,
  profile photo and nav are named, so they stay put while the page under
  them fades out and the new one rises in. Each page's head carries a
  one-line inline script that adds `.vt-in` on those arrivals, which stops
  the header playing its entrance again. It has to be inline in the head:
  `pagereveal` fires before the deferred scripts run. Keep it on any new
  page, and keep the three names unique.
- A ticket's "Quote first" badge is stamped on after its tape (`stamp`).
- The route cards' arrows lean the way they go on hover.
- Pointing at the header photo lifts its tape, the hint that it comes away.
- Arriving from a ticket, the preselected job picker ripples twice, so the
  visitor sees it was filled in for them.
- The photo viewer's scrim fades up and the photo rises into it; next and
  previous slide in from the side they come from.

Second pass, from a motion audit:

- `land` has air in it: each card starts a little to one side (`--drift`,
  set beside `--tilt`, against it) and a little nearer, and slides back
  under itself as it drops.
- The signature is written, not faded: a clip runs across it like a pen.
  Its fill is `backwards` so no clip is left on it afterwards.
- Each ticket's icon acts out its job once on hover or keyboard focus,
  matched by the ticket link's `job=` key, so a new ticket needs its own
  line there or its icon stays still.
- Turning a print lifts it off the desk (`turn-over`/`turn-back`), only
  after `desk.js` marks it `.has-turned`, so nothing lifts on load.
- Hover lifts sit behind `@media (hover: hover)`: a touch screen keeps
  `:hover` on the last thing tapped, which left cards lifted. Touch gets a
  press instead (`:active`, which iOS only applies because `motion.js`
  listens for `touchstart`). Keyboard focus lifts everywhere.
- Print shows everything finished: no animation, `.land-wait` cards
  visible, every `--p` forced to 1.

### Curves

Three tokens on `:root`, and nothing else:

| Token | Feel | Use |
|---|---|---|
| `--e-spring` | settles with about 4% overshoot | hover lifts, tape peel, the nav pill, chevrons, status messages |
| `--e-bounce` | about 16% overshoot | pops: a button let go, a timeline dot filling |
| `--e-out` | no overshoot | fades, colour, folds, `land`, `tape-press`, `fadeUp` |

The springs are damped-spring samples in `linear()`, with `cubic-bezier`
stand-ins behind `@supports`. A spring needs about twice the time of an
ease to settle (0.4s for a hover lift, not 0.2s). `land` and `tape-press`
key their own bounce, so they run on `--e-out`.

The one exception is the print flip in `desk.js`: its faces swap at the
halfway mark, so the turn must cross zero at exactly half time, and a
spring would show the wrong face.

### Adding motion

1. Say what it shows: an arrival, an action confirmed, or a change
   explained. If it shows nothing, leave it out.
2. Use one of the three curves.
3. Animate `transform`, `translate`, `rotate`, `scale`, `opacity` or
   `clip-path`. A height animation is only for a fold, where pushing what
   is below is the point.
4. The finished state must not depend on the animation: reduced motion and
   JS off both show it.
5. Cover it in the reduced-motion block, including any pseudo-element.
6. Never take or drop focus.
7. Keep it paper: no blur, glow, glass or pointer-following light.

## 3D models

Two real 3D models:

- Experience, Homelab record: the 2016 MacBook Pro, whose lid opens as you
  scroll, then Proxmox VE, its virtual machines and containers, and the
  services and n8n lift apart above it (`scenes/homelab.js`).
- Home, under "Some of what I do": the seven service tickets as paper cards
  in a ring that revolves while its section is pinned (`scenes/services.js`,
  `data-pin`). Callouts sit still at the sides with leader lines following
  each card; they are the real links to book that job, so they work with a
  keyboard and stay readable. Under reduced motion, with JS off or with no
  WebGL, the pinned track collapses and the three plain tickets show
  instead.

A five-mile map and a rowing eight were tried and dropped as bloat: add a
model only where it explains or leads somewhere the words alone do not.

The ideas come from David's Byte Size video engine (`video-prod`), not its
code: every surface takes a palette role (`kit.mat`), models are low-poly
and flat-shaded under key, rim and fill lights, a soft disc stands in for a
shadow, and the camera arrives wide and high, makes one eased swing, racks
into focus and pushes in. In a video that runs on the frame number; here it
runs on scroll progress, so it plays backwards scrolling up and stops when
the page stops.

- `scene3d.js` is the runtime and its header is the contract. A model is a
  module in `scenes/` exporting `build(THREE, kit)`.
- three.js 0.170 is vendored in `vendor/three/` (MIT, licence beside it)
  and only downloaded when the figure comes within a screen of view. It is
  a cut-down build holding only the classes in `vendor/three/entry.js`
  (514 KB against 692 KB for the full file). Using a class that is not in
  the entry means rebuilding it once: `npm i three@0.170.0 esbuild` in a
  scratch folder, then `npx esbuild entry.js --bundle --format=esm --minify
  --legal-comments=inline --outfile=three-site.min.js`. That is the only
  build step anywhere, and it runs once by hand, not on deploy.
- The caption is the content; the canvas is `aria-hidden`. The stage holds
  its space when JS is on (the `js` class from the head script), and with
  JS off or no WebGL only the caption shows.
- Reduced motion renders the finished state. A sideways drag turns the
  model and it springs back; vertical swipes still scroll.
- Progress is measured from layout position (`offsetTop`), not
  `getBoundingClientRect`, because the record holding the model may still
  be landing when it is read.

## The photo desk

`desk.js` turns the Photography grids into a pile of prints: throw them, tap
one to turn it over, and scrolling sorts them into a grid, after which a tap
opens the full-size viewer from `gallery.js`. The prints are the grid's own
`a.photo` links moved onto the desk, so with JS off the grids stay as they
are and the viewer works either way.

Each photo link carries `data-group`, `data-name`, `data-kind` and
`data-note` for the print's name and the back of the card. A link without
`data-name` stays out of the pile. Keep the back real: it is written from
what the photo shows, the same as its alt text. A new photo needs those four
attributes to join the pile.

On a touch screen a vertical swipe always scrolls the page and only a
sideways swipe throws a print, so the pile never traps a thumb. Reduced
motion keeps the pile still and the sort jumps instead of animating.

## The booking form

The formspree endpoint is the form's own `action` in `services.html`, which
doubles as the fallback when JS is off: without it the submit would do
nothing. `contact.js` reads that attribute rather than keeping a second copy.
If the action is ever empty the form says so and points at Instagram instead
of pretending to send.

Spam is handled by the `_gotcha` honeypot, not reCAPTCHA. reCAPTCHA expects a
widget on the page and silently fails an AJAX submit, so leave it off in the
formspree dashboard.

Formspree requires a field named exactly `email` and rejects the submission
with "email is missing" without it. Do not rename that field. It is also what
sets Reply-To, so a reply goes straight back to whoever enquired. The phone
field is optional and separate.

The form does not carry `novalidate`: the browser enforces the required fields
and the email format, so bad input never becomes a formspree error.

Do not publish an email address or a phone number anywhere on the site, in
the JSON-LD included. A plain address in the page source is what harvesters
collect, and David asked for it out on 2026-09-20. The form and the Instagram
link are the two contact routes. Formspree holds the address it notifies, so
enquiries still reach him without it being public.

See `.claude/review-002-2026-09-19.md`.

## Content that must stay real

Prices, grades, view counts and testimonials are all either real or absent.

Replies are promised within two days, David's figure from 2026-09-24. If
that stops being true, change the Services and home contact blocks, the
Experience block and the success message in `contact.js` together.

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
them on 2026-09-19 and kept them, and asked for the fonts again on
2026-10-14 after trying alternatives.

The fonts are served from `fonts/` (Latin subset, WOFF2, with each font's
OFL licence beside it), not from Google: some networks block
fonts.googleapis.com and the page then falls back to the system font. Caveat
is for the signature only; the photo prints use the same fonts as the rest
of the site.

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
## Agent notes

This file is the project brief for whichever coding agent is being used. It
is named AGENTS.md rather than CLAUDE.md because that is the cross-tool
standard and reads as project documentation rather than one vendor's config.
Claude Code falls back to AGENTS.md when no CLAUDE.md exists in the working
directory or any parent, so do not add one back.

Keep the assistant out of what a visitor sees: no tool name in commit
messages, trailers, code comments or page copy. David asked for this on
2026-09-23.

## antislop
For UI, copy, people, mobile layout, or code comments work, read `.claude/skills/antislop/SKILL.md` (core) and then the skill for the task:
- UI / visual: `.claude/skills/antislop-ui/SKILL.md`
- Copy & text: `.claude/skills/antislop-copywriting/SKILL.md`
- People: `.claude/skills/antislop-human/SKILL.md`
- Mobile / responsive: `.claude/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `.claude/skills/antislop-code/SKILL.md`
Before starting, ask the user when antislop applies: during the work, or after it is done.
<!-- antislop:end -->
