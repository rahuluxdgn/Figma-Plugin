# Theme Compare for Figma

A Figma plugin for developers and designers to compare selected frames, components, or variants across variable modes.

## What it does

- Select one or more frames, components, instances, or sections.
- Add multiple variable collection groups.
- Choose one or more modes in each collection.
- Create labeled comparison sections on the Figma canvas.
- Keep original design nodes unchanged.

## Install in Figma

1. Download or clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Build the plugin:

   ```bash
   npm run build
   ```

4. Open Figma desktop.
5. Go to **Plugins → Development → Import plugin from manifest**.
6. Select this file:

   ```text
   manifest.json
   ```

7. Select one or more supported nodes and run **Theme Compare**.

## Development

Use watch mode while editing:

```bash
npm run watch
```

After changing `code.ts`, rebuild before reloading the plugin in Figma.

## Requirements

- Figma desktop app
- Node.js and npm
- A Figma file with local variable collections and modes

## Current scope

This is a Phase 1 proof of concept. It creates visual comparison sections and supports multiple collections and modes. Detailed variable difference reports, hard-coded color audits, and accessibility checks are planned for later phases.
