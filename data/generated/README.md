# Generated Data

This folder is for local ingestion output.

The app does not read from this folder yet. Current UI data still comes from `lib/data.ts`, so failed or missing ingestion output will not break Fight Lens.

Generated files should be treated as sourced snapshots or parser output, not hand-edited app data.

Use `npm run normalize:data` to turn generated source files plus manual overrides into app-ready files under `data/normalized`.
