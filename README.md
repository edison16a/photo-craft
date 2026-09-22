# Photo Craft

Tired of paying for Canva? Try this free alternative, built only for simple image editing, creation and iteration.

Use it at **[photo-craft.vercel.app](https://photo-craft.vercel.app)**, or run it yourself (see below). The hosted version has everything except background removal, which needs Python on the server.

Photo Craft runs entirely in your browser. Pick a canvas size, add text, shapes and images, arrange them, then export at any size in PNG, JPG, WebP or PDF, with a transparent background if you want one. Projects are saved in the browser's own storage. There is no account, no watermark and no paywall.

## What it does

- Projects with preset sizes (Instagram, YouTube, A4, logos, wallpapers and more) or any custom size from 16 to 10000 px.
- Pages inside a project. Add, duplicate, rename, reorder and delete them.
- Text with more than 250 fonts (system fonts plus Google Fonts), bold, italic, underline, alignment, line height, letter spacing and a colour picker with 300 swatches plus any custom colour.
- Simple shapes: rectangle, ellipse, triangle, diamond, pentagon, hexagon, star, line and arrow, each with fill, outline and corner radius.
- Images from your disk, from a link, from the clipboard, or dragged in from a Google Images tab. Optional inline Google image search with your own free API key.
- Select one item or many. Drag them together, resize from the corners (images and text always keep their proportions), rotate, flip, lock, align and reorder.
- Alignment guides that snap to the page edges, the page centre and the edges and centres of other items.
- A properties panel with a preview of the selected item, its position, size, rotation, scale and opacity.
- Undo and redo, keyboard shortcuts, zoom and pan.
- Export at 0.5x to 4x or an exact width, as PNG, JPG, WebP or a multi page PDF. Several pages export as a ZIP.
- Save on demand or with autosave. Light and dark mode.
- Optional one click background removal for images, powered by a free Python model that runs on your own machine.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

Other scripts:

```bash
npm run build      # production build
npm start          # serve the production build
npm test           # unit tests (vitest)
npm run typecheck  # tsc
npm run lint       # eslint
```

## Background removal (optional)

Select an image and press "Remove background" in the side panel to cut out the subject and make the rest transparent. This runs on the machine that serves the app (your own computer when you run `npm run dev`) with the open source [rembg](https://github.com/danielgatis/rembg) model, so it is free and nothing leaves your machine.

It needs Python 3.9 or newer:

```bash
pip install -r requirements.txt
```

Then restart the server. The first removal downloads the model (about 170 MB) into your home folder and can take a minute. After that each image takes a few seconds on a normal CPU.

Two environment variables tune it:

| Variable | Meaning |
| --- | --- |
| `PHOTO_CRAFT_PYTHON` | Interpreter to use, for example the one inside a virtual environment. Defaults to `python3`, then `python`. |
| `PHOTO_CRAFT_BG_MODEL` | rembg model name. Defaults to `u2net`. `isnet-general-use` is sharper on photos, `u2netp` is small and fast. |

If Python or rembg is missing the button stays disabled and the panel says why. Hosted platforms without Python (for example Vercel) will not offer the feature.

## Google image search

The Elements panel always offers a Google Images popup. Search there and drag any picture onto your page. For inline results inside the editor, add a free Google Custom Search API key and a search engine ID in the panel. Both are stored in your browser only. Google allows 100 free searches a day.

## How the code is organised

The app is a Next.js 15 project with the App Router. The three routes are `/` (your projects), `/new` (pick a size) and `/editor/[projectId]`.

- `src/model`: the project, page and element types, plus factories.
- `src/data`: presets, fonts, colours and shape geometry.
- `src/lib`: browser free helpers: geometry, snapping, IndexedDB, ZIP writing, image loading, drag and drop parsing, font loading, and the export renderer under `src/lib/export`.
- `src/store`: the zustand stores. `project-store` holds the open project, selection and undo history and is split into slices. `editor-ui-store` holds tool, panel, zoom and pan.
- `src/hooks`: React hooks for saving, autosave, shortcuts, theme and settings.
- `src/components`: UI. `editor/canvas` is the Konva stage, `editor/panels` the side panel.
- `src/services`: the Google search client, local settings and the background removal client.
- `src/server` and `app/api/background-removal`: the server side of background removal. It keeps one Python worker (`scripts/background_remover.py`) alive and talks to it over stdin and stdout.

Every file stays small and does one thing. The export renderer and the live canvas share the same attribute builders in `src/lib/konva/element-attrs.ts`, so what you see is what you export.

## Shortcuts

| Keys | Action |
| --- | --- |
| Ctrl+Z, Ctrl+Shift+Z | Undo, redo |
| Ctrl+S | Save |
| Ctrl+A | Select all |
| Ctrl+C, Ctrl+V | Copy, paste |
| Ctrl+D | Duplicate |
| Delete | Remove selection |
| Arrows, Shift+Arrows | Nudge by 1 px or 10 px |
| Ctrl+Plus, Ctrl+Minus, Ctrl+0 | Zoom in, zoom out, fit |
| Escape | Deselect or finish editing text |
| Ctrl+Wheel | Zoom around the pointer |
| Wheel | Pan |

## Licence

MIT.
