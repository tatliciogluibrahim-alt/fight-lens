# Fight Lens

Fight Lens is a prototype UFC matchup intelligence dashboard for creators, analysts, and fight teams.

The product is intentionally not a betting app. It avoids picks, odds, locks, parlays, and guaranteed-winner language. The goal is to show the shape of a fight through clean visual blocks: fight shape, style clash, recent momentum, resume heat, key edges, paths to victory, and creator cards.

## Status

This is an early prototype.

- The main UI still has a local mock/prototype fallback in `lib/data.ts`.
- Sourced UFCStats snapshots and normalized outputs live under `data/generated` and `data/normalized`.
- The next data cleanup should make one clear app data loader so pages do not mix sources ad hoc.
- Manual context lives under `data/manual`.
- Mock/prototype data is labeled in the UI with `Prototype data` badges.
- Data should be labeled with provenance where possible: `mock`, `manual`, `sourced`, or `derived`.
- Fighter photos are placeholders only. Real fighter images should be added later only if they are licensed or user-provided.
- Country markers use public flag assets from [FlagCDN](https://flagcdn.com/), which is provided by Flagpedia.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Local JSON/mock data
- Lightweight ingestion scripts for UFCStats snapshots

## Getting Started

Install dependencies:

```bash
npm install
```

Run the app locally:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful routes:

- `/` - overview
- `/events/ufc-328` - UFC 328 card dashboard
- `/events/ufc-328/chimaev-strickland` - main matchup lens
- `/backtests/islam-jdm` - Islam vs. JDM forecast-vs-actual backtest
- `/methodology` - public methodology and Fight Shape metric definitions

## Quality Checks

Run these before committing:

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run build` uses `next build --webpack` for a more reliable local build in this project.

## Development Notes

Helpful project docs:

- `docs/DESIGN_DIRECTION.md` - visual target and asset policy
- `docs/QA_CHECKLIST.md` - routes, viewports, visual QA, and data QA
- `docs/INGESTION_PLAN.md` - safe public-data ingestion architecture
- `docs/TODO_DATA_INGESTION.md` - next ingestion/data-contract tasks

## Data Notes

The app is designed so missing sourced data does not break the UI.

- `lib/data.ts` is the beginner-friendly mock data fallback used by the main UI.
- `data/manual` contains manual rankings, country metadata, model priors, paths, and context notes.
- `data/generated` contains local ingestion output.
- `data/normalized` contains app-ready normalized JSON built from generated data plus manual overrides.
- UFCStats-derived rows should be treated as sourced snapshots, not live data.
- Manual priors are used where public stats do not fully explain context, such as opponent quality or pound-for-pound status.

Run ingestion/normalization scripts only when intentionally refreshing data:

```bash
npm run ingest:ufcstats
npm run normalize:data
npm run backtest:islam-jdm
```

The ingestion layer should stay separate from the UI. Do not put scraping logic inside React components.

## Environment Variables

No environment variables are required for the current prototype.

There are no API keys, auth secrets, database URLs, or private credentials needed to run or deploy the app.

## Vercel Deployment

Recommended Vercel settings:

- Framework preset: Next.js
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: leave blank/default
- Environment variables: none required

Deployment steps:

1. Push this project to GitHub.
2. Import the GitHub repo in Vercel.
3. Keep the default Next.js settings.
4. Deploy.

## Git Hygiene

Do commit:

- `app`
- `components`
- `lib`
- `data/manual`
- `data/normalized`
- documentation
- config files
- `package.json`
- `package-lock.json`

Do not commit:

- `.next`
- `node_modules`
- `.vercel`
- `.env*`
- local ingestion cache files under `data/generated/ufcstats/cache`

Suggested first commit message:

```text
Initial Fight Lens prototype
```
