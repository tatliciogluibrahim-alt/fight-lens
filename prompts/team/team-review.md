# Team Review Prompt

Run a multi-agent review of this product or feature.

Fight Lens note:
This repo is an active working prototype. Do not treat it as a blank-slate concept unless the user explicitly asks for a rebuild. Reviews should assume the current app, routes, Tailwind setup, mock data fallback, ingestion scripts, and Vercel/GitHub deployment path already exist.

Spawn or simulate the following agents:

1. Creative Director
2. Product Marketing Manager
3. CMO / Growth Lead
4. CTO / Systems Architect
5. QA / Ruthless Tester
6. Ideator / Concept Lab, only if new ideas are needed

Each agent should review from their own role.

Then synthesize:

1. Where the team agrees
2. Where the team disagrees
3. Top 5 recommendations
4. What to build next
5. What not to build yet
6. Risks
7. Codex-ready implementation prompt

When prompts conflict, use this priority order:

1. The user's latest request
2. `AGENTS.md`
3. The current repo structure and README
4. The role-specific prompt
5. Older concept briefs or historical notes

If a role-specific output format conflicts with this synthesis format, return the synthesis format and weave in role-specific findings.

Important:
Do not edit code unless explicitly asked.
Be direct and useful.
Avoid generic advice.
Prefer small, shippable next steps over full rebuilds.
