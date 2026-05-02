# Fight Lens QA Checklist

Use this before pushing visual or data changes.

## Routes

Check:
- `/`
- `/events/ufc-328`
- `/events/ufc-328/chimaev-strickland`
- `/backtests/islam-jdm`

## Viewports

Check at least:
- mobile around 390px wide
- tablet around 768px wide
- desktop around 1440px wide

## Visual QA

Confirm:
- header/navigation stays readable
- card dashboard rows are scannable
- matchup modules feel screenshot-ready
- creator-card blocks are easy to find
- flags render cleanly or fall back gracefully
- fighter asset placeholders look intentional
- stats align consistently even when fighter names are different lengths
- no module feels cluttered or sportsbook-like

## Data QA

Confirm:
- mock/prototype data is clearly labeled
- manual, sourced, and derived values are not presented as certain facts without context
- missing data does not break the page
- charts do not invent values when input data is absent
- no betting language appears in UI copy

## Commands

Run before committing when possible:

```txt
npm run typecheck
npm run lint
npm run build
```
