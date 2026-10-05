# Connecting Yuki's free AI

Yuki is published on the existing Jekyll portfolio. Her approved artwork and animations remain unchanged. This setup uses Cloudflare Workers AI, not the OpenAI API. No OpenAI account/key or ChatGPT subscription is required for visitors. The backend is **enabled with owner approval**, and an English conversation has passed the complete live website flow.

## Setup status — October 5, 2026

- Verified **Workers Free — Current plan** in the account dashboard. No paid plan, credits, or Gateway was enabled.
- Deployed `yuki-portfolio-chat` with its AI binding and SQLite-backed quota object. Public endpoint: `https://yuki-portfolio-chat.lsanderson1-github-io.workers.dev/chat`.
- Created the Managed Turnstile widget **Yuki Portfolio Chat**, restricted to `lsanderson1.github.io`, with no challenge pre-clearance.
- Stored `TURNSTILE_SECRET` and a cryptographically random `IP_HASH_SECRET` directly in Cloudflare through standard input, without placing their values in website files or chat. Deployment credentials use encrypted storage with the key in Windows Credential Manager.
- Added only the public endpoint and Turnstile site key to `_data/yuki.json`.
- Published website commit `f90c6c4`; GitHub Actions run `37280121826` completed successfully. The public knowledge index responds successfully and contains 34 English/Japanese pages.
- Set both activation flags to true after reconfirming Workers Free and obtaining owner approval. Current Worker version after the knowledge-loading fix: `7053969b-bfdf-4158-a8e7-790544511e05`.
- Live endpoint checks pass: foreign origin rejected (403), permitted preflight accepted (204), malformed input rejected (400), invalid bot token rejected (403). The disabled-backend response was also verified before activation.
- All 47 local tests pass, including redirect rejection and sanitized error-stage identifiers. Real model-binding tests returned an English introduction and a Japanese Blender CLI explanation with its correct Japanese source link. These are actual Workers AI calls, not mocked replies; they do not substitute for the complete browser/Turnstile test.
- A real browser request passed verification and quota reservation but failed with `YUKI_KNOWLEDGE`. An authenticated remote preview reproduced the exact cause: Cloudflare Workers rejects `fetch` with `redirect: 'error'` before making a network request. Switched the knowledge fetch to `redirect: 'manual'` and retained rejection of every non-2xx response, including redirects. The same remote preview then read all 34 public pages successfully (HTTP 200). The fix was deployed and committed as `fdf331e`.
- **Live browser success confirmed:** after the fix, the owner completed verification and sent the prepared English question. Yuki returned an introduction identifying herself as Lloyd's baby-dragon companion and AI mascot, and accurately described the portfolio's game-development and 3D work. The reply was independently observed in the public website's conversation panel. The full Japanese-page/Turnstile flow and broader live safety/navigation checks remain unverified; the Japanese model-binding check above passed separately.

## Stay on the free plan

As checked on October 5, 2026, [Workers AI includes 10,000 Neurons per UTC day on Workers Free](https://developers.cloudflare.com/workers-ai/platform/pricing/). This is a shared compute allowance, not 10,000 messages. Usage depends on the model and input/output length. Once exhausted, requests fail on the Free plan instead of billing overages. Other free Worker and storage limits also apply. Limits and model eligibility can change; recheck before activation.

**Keep the account on Workers Free. Do not enable Workers Paid, buy AI Gateway credits, or configure a paid fallback.** The application cannot inspect or guarantee your actual billing plan. `FREE_PLAN_CONFIRMED` is an owner acknowledgement, not an automatic billing check. If the account is later upgraded, this flag will not prevent Cloudflare billing under the new plan.

The backend pins `@cf/qwen/qwen3-30b-a3b-fp8`, currently eligible for Workers Free, and calls it directly through the AI binding. It ignores visitor/environment model overrides and has no OpenAI route, Gateway configuration or automatic retry. [Cloudflare model reference](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/). Initial real English/Japanese binding checks passed, but broader conversational quality and browser animation cue reliability still need the live checks below; they are not established by mocked tests.

## What you need to do personally

1. Sign in or create an account at [Cloudflare](https://dash.cloudflare.com/). Confirm **Workers Free** in the account's Workers plan. If prompted to pay or upgrade, stop. There is no need to buy a domain or transfer the GitHub Pages site.
2. This implementation also uses SQLite-backed Durable Objects for quotas, which are [available on Workers Free within its limits](https://developers.cloudflare.com/durable-objects/platform/pricing/), and a free Turnstile bot-check widget. We can do the remaining setup together once you are signed in.
3. Keep passwords and secret keys out of chat, screenshots, GitHub and website files. Complete account agreements and login yourself. Only the Worker URL and Turnstile **site key** are public.

## Backend setup (we can do this together)

Use Node 22 or newer. In the repository root:

```powershell
npx wrangler@4 login --use-keyring --scopes account:read user:read workers_scripts:write ai:write challenge-widgets.write
npx wrangler@4 deploy --config services/yuki-api/wrangler.toml
```

For a new account or fresh installation, set `CHAT_ENABLED` and `FREE_PLAN_CONFIRMED` to false before that first deployment. This repository now records the existing, owner-approved active deployment. Record its `https://yuki-portfolio-chat.<your-subdomain>.workers.dev` address. This is a public URL, not a secret. The `[ai]` section binds Workers AI directly; it needs no model API-key secret. See [Workers AI bindings](https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/).

In Cloudflare Turnstile, create a **Managed** widget restricted to `lsanderson1.github.io`. The website requires consent before loading Turnstile. Its site key is public; its secret key belongs only in the Worker. Server-side verification checks both the exact hostname and `yuki-chat` action, as described in the [Turnstile validation guide](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Store these two secrets using the hidden interactive prompt—not in the command itself:

```powershell
npx wrangler@4 secret put TURNSTILE_SECRET --config services/yuki-api/wrangler.toml
npx wrangler@4 secret put IP_HASH_SECRET --config services/yuki-api/wrangler.toml
```

For `IP_HASH_SECRET`, generate a unique random string of at least 32 characters in your password manager. Keep it stable; changing it resets visitor counters for the day. Cloudflare's [secrets guide](https://developers.cloudflare.com/workers/configuration/secrets/) explains protected secret storage.

In `_data/yuki.json`, set **only public values**:

```json
{
  "enabled": true,
  "chat_endpoint": "https://yuki-portfolio-chat.YOUR-SUBDOMAIN.workers.dev/chat",
  "turnstile_site_key": "YOUR-PUBLIC-SITE-KEY"
}
```

Publish the website (when approved), and verify `/assets/yuki/knowledge.json` is publicly available. After confirming Workers Free, set `FREE_PLAN_CONFIRMED = "true"` and `CHAT_ENABLED = "true"` in `services/yuki-api/wrangler.toml` and deploy again. Keep `SITE_ORIGIN` equal to the exact HTTPS website origin, without a trailing slash. A custom domain later requires updating both this value and Turnstile's allowed hostname.

Public connection values are configured and the backend is enabled. The production widget is restricted to the live GitHub Pages hostname; localhost cannot complete production chat. Animation and guidance still work locally. Do not loosen origin/bot checks to make localhost bypass production protections. A real inference smoke test uses your free allocation; it is not an offline model.

## Remembered chat permission — prepared October 6, 2026

The new client flow remembers explicit visitor permission in `localStorage` under `yuki-chat-consent-v1`. That flag is shared across English/Japanese pages and later visits on the same browser/origin. It does not contain messages or verification tokens. The visitor can revoke it under **AI chat on · Privacy**; other open tabs respond to that change. Clearing site storage resets permission. Browsers that block storage get a visible warning and page-only permission.

After permission, opening the bubble prepares a fresh Turnstile check. The Managed widget uses `appearance: 'interaction-only'`: Cloudflare can complete checks in the background, but visitors must complete any interactive challenge themselves. The challenge stays outside the collapsed privacy disclosure. Tokens remain in memory, are single-use, and refresh automatically; they are never treated as permanent permission. See [Cloudflare widget configuration](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/).

Only an explicit **Send** makes an AI request. It may wait for verification and has a Cancel button. Closing the bubble cancels pending sending; hiding/leaving the page stops its verification widget. Revoking permission also aborts the browser request, although data already sent cannot be recalled. Loading the widget or refreshing a check never resends an AI message. No API limits, Worker origin/hostname validation, or free-plan safeguards were changed.

Local previews now disable the production chat controls, explain the limitation, and link to the equivalent live page. `_includes/yuki.html` passes Jekyll's configured `site.url` for this client-side check; the Worker remains the security boundary. Do not replace the production origin with localhost. Unit tests cover storage, cancellation, expiry, stale callbacks and challenge failures; local browser checks cover the preview UI. The remembered-permission/Turnstile browser flow still needs testing on the published site after this change is deployed.

## Page-aware explanations — prepared October 6, 2026

`_plugins/yuki_knowledge.rb` builds the version-2 public index from final rendered `<main>` content after Jekyll renders its layouts. This includes published project/essay/journey pages, home/list pages and the full résumé, including download instructions supplied by layouts. Drafts and unpublished pages are excluded. Headings and described images receive nonvisual context identifiers; existing anchors remain intact, with ASCII aliases for Japanese heading links. No artwork is redrawn or moved. The current build indexes 42 pages with 312 section/image targets, including 50 described images.

When Send is pressed, the browser captures the approximate central visible section plus the most recent completed guide target. Only page paths and short section/image identifiers are sent, not screenshots, arbitrary DOM text, form values or selected text. The Worker resolves these identifiers against its own public index and discards unknown references or any supplied text. A small “On this page” label shows the current inference; it is not eye tracking. The last guided reference expires after 30 minutes in tab session storage and is removed by Clear chat. It survives a same-tab page change; a language switch retains the equivalent page but does not incorrectly reuse another language's section IDs.

Retrieval searches all indexed sections and overlapping chunks, including content beyond the old 1,800/5,000-character cutoffs. At most six excerpts of 1,700 characters are supplied, with the current section and last guide target reserved when valid. Recent user questions assist follow-up retrieval. The AI prompt distinguishes the current section, a previously guided item and an explicitly named different topic; ambiguous references should prompt a clarification. It can give deeper explanations while separating conceptual background from documented project implementation. The same 700-token output limit and quota safeguards remain.

AI source links can now identify a particular heading or picture. Show me navigates to the real section/image rather than an unrelated project card; local guide search also includes these targets. After guiding, **Explain what you showed me** submits a contextual question only when clicked, with the usual consent, verification and quota checks. There are no AI calls on scrolling, arrival or automatic navigation. Picture explanations use published alt descriptions and figure captions, not visual analysis or video understanding. No fallback response is falsely labeled as AI.

Run `node --test tests/yuki-*.test.mjs`, build Jekyll, then run `node scripts/check-yuki-knowledge.mjs`. The build audit verifies every context identifier and source anchor against generated files, English/Japanese museum grounding, full résumé text and the 2 MB index ceiling. Local tests use mocked model replies; they verify the request/retrieval/source pipeline, not model answer quality. **Both the website build and the updated Worker must be published** before live page-aware AI can work; no deployment was performed for this change. Test live EN/JA follow-ups after publication, including an image and a section near the end of a long page.

## Initial safeguards (unchanged)

- At most **100 reserved model requests per UTC day**, **20 per visitor/IP per day**, and **4 per minute per visitor/IP**. Reservations are atomic; failed provider calls still use a reservation. Visitors sharing a network share that visitor limit.
- Each request has bounded message/history/context lengths and a maximum of 700 generated tokens. No automatic retries. A 22-second inference timeout ends the visitor's wait but cannot cancel work already running at Cloudflare. These application limits reduce usage; the **Cloudflare Free plan**, not a dollar cap in our code, prevents paid overages.
- A missing binding/secret, unconfirmed free plan, bot verification failure, exhausted limit, missing quota service or unavailable site index results in a clear unavailable response. The guide buttons and animations remain usable; no canned message is passed off as an AI answer, and no paid or unprotected fallback is called.
- `CHAT_ENABLED = "false"` + redeploy immediately stops new model calls. `_data/yuki.json` `enabled:false` hides the companion on the next site publish.
- Model output is plain text plus allowlisted emotion/gesture choices. Links come from the server's site index, not arbitrary model URLs. Suggested navigation needs the visitor's click.
- Messages and recent conversation go to Cloudflare Workers AI only when the visitor consents and sends; consent also loads Cloudflare's Turnstile check. We do not store chat transcripts server-side. The browser keeps the latest 12 messages in tab session storage, expires them on reload after 30 minutes, and offers Clear chat. Quota storage contains daily salted IP hashes/counters and expires after two days. Cloudflare's [data usage policy](https://developers.cloudflare.com/workers-ai/platform/data-usage/) and applicable model terms still apply. Revoking consent cancels the browser's pending request/display, not data already sent.
- This first integration is **text chat**, not microphone input, voice synthesis or word-synchronized lip-sync. Approved talk/reaction animations express the response; voice can be added separately later.

## Verify before calling AI live

1. Run `node --test tests/yuki-*.test.mjs`, then build Jekyll normally (`bundle exec jekyll build`).
2. Check sleeping → click/wake → breathing idle; Projects/Essays guidance; EN ↔ JA and other page navigation; Hide, Pause, Clear; phone-size layout and reduced-motion preference.
3. On the deployed website, consent to chat and complete Turnstile. Ask one English and one Japanese question about a real project, plus one about Yuki. Check the source link, expression and gesture.
4. Ask about a nonexistent qualification; she should not invent it. Try markup in a message; it must render as text. Ask for an external destination; no automatic navigation should occur.
5. Check repeated requests reach the configured limit and unavailable/provider-error states are honest. Confirm no secret appears in browser files or Git history. Live inference, JSON-mode compatibility, Turnstile and Durable Object behavior still require this deployed smoke test after configuration. If a model/format is unavailable, fix or select another confirmed free-tier model explicitly; never silently retry on a paid provider.
6. Recheck the Cloudflare dashboard after testing: Workers remains Free, usage is within its allowance, and no paid add-on/Gateway was enabled. Do not claim production AI is working until actual English/Japanese conversations pass these checks.

## Updating artwork and site content

### Compact bubble and content-safe positioning

Replies and the message composer share a small speech bubble beside Yuki. The menu contains relevant guide highlights, history, and controls; consent stays under the AI privacy disclosure, while any required Turnstile interaction appears directly below it. No new paid service or spending is introduced.

No page width, margin, reserved strip, or scrolling container is changed. Yuki is labeled **BETA** in the English/Japanese chat. The browser reads rendered text line boxes, links, controls, and images to choose clear destinations. If a full-size pose cannot fit in empty space, she uses the least-obstructive edge and may temporarily overlap content. She is never squeezed to fit. A fixed **Call Yuki / ゆきを呼ぶ** button lets the visitor bring her to their current view; after an explicit Hide action it becomes Show Yuki.

Her artwork uses a single proportional scale (155px standing body on desktop, 138px on phones, unchanged in short/landscape viewports). Perches and flight routes use document coordinates: scrolling leaves her at that page location and never starts a following flight, even with chat open. Her bubble leaves the viewport with her, preserving its conversation. Call Yuki returns her by an animated flight; if she is far offscreen, the flight enters just outside the nearest vertical edge without relocating visible artwork. Only horizontal containment responds to viewport resizing. Occasional independent flights use a 75–120-second minimum interval and defer while scrolling, asleep, chatting, guiding, reacting, offscreen, paused, or in reduced motion. Already-loaded travel clips remain cached to avoid missing frames on a later flight. Artwork pixels and frame order are unchanged.

The guide menu defaults to at most eight relevant local/featured highlights rather than every heading. Searching the language-specific public page index returns at most twelve ranked matches. Source “Show me” buttons locate the actual card/heading, reveal the correct carousel card, or carry a short-lived guide request to another page. She travels first, then points from beside the destination. Text-range measurements highlight the title itself, not its full-width heading block. Only the destination is highlighted; programmatic focus no longer outlines Yuki during pointing. AI never supplies arbitrary selectors or pixel coordinates. A new page chooses a new perch while preserving the existing same-tab awake/preferences/chat state.

The first accepted greeting wave is remembered across page visits and languages in anonymous local storage (`yuki-visitor-v1`). Later openings use two-handed talk. One hundred English and one hundred Japanese greetings cycle without repeats until the pool is exhausted; the original forty softer greetings are retained alongside sixty varied additions per language. Only their indices and the met flag persist, not chat text. New visitors get an introduction first. Clearing browser storage resets this first-meeting behavior. These are authored local greetings, not generated AI replies, and do not make model requests. Replies can play a complete contextual expression followed by a complete talk gesture, without blending incompatible hands or mouths. The backend prompt mixes warmer, gently quirky baby-dragon language with contextual emotion/gesture guidance while retaining factual safeguards; it requires a separate Worker deployment to affect live AI replies.

Each Call Yuki request samples a new suitable position across the current viewport, using fresh rendered obstacles and avoiding her current/recent positions when alternatives exist. Occasional independent flights use the same selector; specific guide requests still route to their actual content targets. It does not prefer the lower-right corner: clear central spaces are eligible too. Recent positions are normalized for resizing and kept only in memory. Completely clear space takes priority over variety; a packed phone screen uses similarly low-obstruction edge positions without shrinking her. Navigation stays above Yuki (layer 50 versus 40), and the falling petals have a separate foreground layer (45) while the branch remains in its original layer. Decorative petals remain noninteractive and respect reduced motion. The bubble is positioned below the visible header so its controls remain reachable.

The chat menu omits the permanent Projects/Essays/Unreal Journey/Resume shortcut row and excludes those category headers/index pages from search suggestions. Individual projects, essays and specific points of interest remain searchable, and contextual source or “Show me” buttons remain available. AI destination suggestions call the guide directly rather than depending on a hidden shortcut button.

Animation coverage: all 44 unique registered sheets have reachable playback paths; the 45th manifest entry, `flight`, is a compatibility alias using the same drawing files as `flightHover`. Sleep/wake/bedtime, breathing/blinking, attention looks, the first-meeting wave, takeoff/landing, left/right/hover flights, both pointing gestures, all eight emotions, and both talk gestures are connected. All ten hovering reactions include their entry/exit bridges. Context determines reactions; hovering versions require being airborne. The crash is intentionally rare (2% of eligible landings after a five-minute cooldown), not played just to fill a rotation. Automated playback coverage asserts that every unique sheet can actually be selected by the renderer; it does not assert that every expression will occur in a particular live conversation.

Verification includes automated API/animation/layout tests for crowded-screen fallback, uniform dimensions, scroll-without-flight, offscreen Call → flight → landing, document-route containment, first/repeat greetings, curated search, exact title bounds, and guide sequencing. Browser checks cover chat open/closed scrolling, calling her back, Hide/Show, and English/Japanese phone layouts. The site theme and background artwork are unchanged; the existing theme follows the browser/device light or dark preference. Live AI still requires the production hostname and human verification.

The website uses the approved drawings as full-resolution lossless WebP files. `assets/yuki/manifest.json` keeps each animation's own frame count, registration and timing; there is no fixed 12-frame requirement. Initial sleep/idle art loads first and other clips load when needed. Her awake state/preferences/recent chat survive same-tab page changes, though a normal page load briefly reloads the widget and chooses a new safe perch rather than preserving an uninterrupted canvas.

The source study can be re-imported with `node scripts/import-yuki.mjs STUDY_DIRECTORY PYTHON_EXECUTABLE` (Python requires Pillow). The import checks alpha and every visible RGB pixel. Its report is `assets/yuki/import-report.json`. Browser animation code is in `assets/yuki/yuki.mjs`; AI behavior is in `services/yuki-api/worker.mjs`. The Worker refreshes its public site knowledge at most every five minutes, so publishing a new project updates its knowledge without changing its prompt manually.
