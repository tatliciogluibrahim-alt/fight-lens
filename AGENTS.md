# Core Product Team Instructions

## User Context

The founder is a non-technical but highly strategic product builder with strong taste, marketing experience, music/culture instincts, and growing vibe-coding ability.

Assume the user needs:
- clear setup guidance
- beginner-readable code
- practical implementation plans
- honest pushback
- taste protection
- no over-engineering
- no fake certainty

## Operating Principle

Act like a best-in-class product studio, not a generic coding assistant.

Every project should be:
- useful
- simple
- visually considered
- technically maintainable
- shippable in small increments
- differentiated by taste, clarity, and restraint

## Default Build Philosophy

Start small.
Ship the smallest version that proves the product has a reason to exist.
Avoid building a giant platform before the core experience is useful.

Prefer:
- clean architecture
- reusable components
- simple data models
- responsive UI
- thoughtful copy
- transparent limitations
- clear README/setup docs

Avoid:
- over-engineering
- unnecessary dependencies
- messy generated code
- fake dashboards
- bloated features
- generic startup language
- corny AI/product language

## Code Standards

Use:
- TypeScript where applicable
- React/Next.js when building web apps
- Tailwind CSS for styling unless the repo says otherwise
- clear file structure
- reusable components
- comments where they help a beginner understand

Do not:
- add dependencies without good reason
- hide complexity from the user
- break existing functionality
- present mock data as real
- implement risky scraping without fallback/caching
- skip build/lint checks when available

## Project: Fight Lens

Fight Lens is a clean UFC matchup intelligence dashboard for creators, analysts, and fight teams.

Tagline:
See the shape of the fight.

Product stance:
Fight Lens is not a betting product. It does not give picks, odds, parlays, locks, or betting advice.

Current state:
Fight Lens is now an existing Next.js prototype, not a blank-slate brief. Future work should iterate the current app, preserve working routes, and avoid rebuilding from scratch unless the user explicitly asks for a restart.

Active routes include:
- `/`
- `/events/ufc-328`
- `/events/ufc-328/[fightId]`
- `/backtests/islam-jdm`

Styling:
This repo uses Tailwind CSS. Earlier concept notes may mention no Tailwind, but for this repo Tailwind is the accepted styling system unless the user explicitly changes direction.

The app should help users understand:
- style clash
- matchup pressure points
- recent fight momentum
- opponent quality
- résumé heat
- paths to victory
- round-level trends

Design should feel:
- premium
- tactical
- calm
- bold when it improves clarity
- data-first
- creator-friendly
- screenshot-friendly
- more film room than sportsbook

Edgy is allowed when it means sharper hierarchy, stronger contrast, more decisive composition, and a premium editorial feel. Avoid fake edginess, cosplay fight-poster design, and anything that makes the app feel like a sportsbook or hype account.

Avoid:
- sportsbook vibes
- neon betting UI
- blood/flames/cage clichés
- bro-MMA graphics
- fake UFC branding
- corny fight poster energy
- overconfident prediction language

Preferred language:
- Lens
- Fight Shape
- Style Clash
- Pressure Point
- Round Trend
- Résumé Heat
- Key Edge
- Path to Victory
- Opponent Quality
- Momentum

Data stance:
- Mock/prototype values must be labeled clearly.
- Prefer provenance labels: `mock`, `manual`, `sourced`, and `derived`.
- Public source data should be cached and normalized outside the UI.
- Do not scrape from React components or Next.js page render paths.
- Manual context is allowed and expected for style tags, rankings, opponent tiers, route labels, and analyst notes.

Source of truth:
- Treat `AGENTS.md` and the current repo structure as the source of truth.
- If an old prompt assumes the app has not been built yet, adapt it into an iteration prompt.
- Preserve existing routes, components, and data fallbacks unless the user asks for a deeper refactor.

## Review Standard

Before finalizing work, check:
- Does this solve the actual user need?
- Is the product still focused?
- Does it still feel premium and calm?
- Does it avoid sportsbook vibes?
- Is the mobile experience clean?
- Are the visual modules screenshot-friendly?
- Is the copy useful and not corny?
- Is the code beginner-readable?
- Are mock/prototype elements clearly labeled?
- Are sourced/manual/derived values labeled honestly?
- Does the app build successfully?

## Commands

Use repo-specific commands if available.

Default commands:
- npm run dev
- npm run typecheck
- npm run lint
- npm run build
