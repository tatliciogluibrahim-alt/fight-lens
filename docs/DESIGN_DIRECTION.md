# Fight Lens Design Direction

Fight Lens is an existing working prototype. Future design work should polish and extend the current app rather than restarting from scratch.

## Visual Target

Fight Lens should feel like a premium fight film-room dashboard for creators and serious fans. It can be bold and edgy, but the edge should come from hierarchy, contrast, restraint, and confidence.

Use:
- dark tactical surfaces
- crisp spacing and strong type hierarchy
- restrained ice-blue accent color (shipped: --accent #9AD9FF on a midnight ground; the "rust" idea was dropped)
- subtle borders and quiet depth
- real flags or graceful fallbacks
- fighter asset slots that feel photo-ready without pretending to use licensed photos
- exportable visual modules that hold up in screenshots

Avoid:
- sportsbook visual language
- neon betting UI
- blood, flames, cages, torn posters, or fake fight-poster energy
- corny hype copy
- generic SaaS dashboard patterns
- decorative complexity that makes the data harder to read

## Page Hierarchy

The matchup page should lead with the clearest read first, then show the evidence. A strong order is:

1. matchup header and core style question
2. Fight Shape
3. Style Clash / overlap visual
4. Last 5 Trend
5. Resume Heat
6. Key Edges
7. Paths to Victory
8. Creator Cards

Creator-card modules should feel prominent because they are a core product loop, not an afterthought.

## Asset Policy

Flags are acceptable prototype assets when they come from a stable public source or local files and have graceful fallbacks.

Fighter photos should only be used if they are licensed, user-provided, or otherwise cleared. Until then, placeholders should look intentional and photo-slot-ready.
