# Photo Craft

A simple, open source photo editor with everything you need for basic photo editing. Free transparent background exports, free background removal, and none of the fluff.

I built it because I was tired of using Canva and being limited on features that cost them nothing to run, like removing a background or exporting a PNG with a transparent background. Photo Craft does both for free, in your browser, with your projects saved on your own machine.

## Screenshots

<img width="1510" height="857" alt="image" src="https://github.com/user-attachments/assets/60f2e79a-4dc0-4473-b224-f3ee90faec28" />

<img width="1512" height="858" alt="image" src="https://github.com/user-attachments/assets/3432091e-355f-48f5-935c-901eea392618" />

## What you get

- Text, images and thirty shapes on as many pages as you like, with undo and redo.
- A draw tool for shapes of your own: click corners or drag along a grid, so every side comes out straight and lined up. Drawing back to the start closes the shape, smooth corners rounds it as you go, and a slider rounds the corners of drawn shapes, polygons and rectangles.
- Colour for photos: paint one flat colour over a picture, keeping its transparency.
- More than 250 fonts, a colour picker with the colours your project already uses at the top, and a floating toolbar next to whatever you select.
- Resize, rotate, flip, lock, align and reorder. Images and drawn shapes keep their proportions unless you switch that off. Alignment guides snap to the page and to other items.
- Export at any size as PNG, JPG, WebP or PDF, with a transparent background where the format allows it.
- One click background removal, in the editor or on its own page where you can drop in a batch of pictures, compare each cutout with its original, touch it up with restore and erase brushes, and download any size. It runs in your browser, so nothing is uploaded.
- Preset sizes for social posts, thumbnails, logos, wallpapers and print, or any custom size.
- Light and dark mode. Projects live in your browser's storage, saved on demand or with autosave.

Use it at [photo-craft.vercel.app](https://photo-craft.vercel.app).

The live site builds from the `main` branch on Vercel. If it ever shows an older version than `main`, open the project on Vercel and redeploy the latest commit.

## Run it yourself

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build      # production build
npm start          # serve the production build
npm test           # unit tests
npm run typecheck  # tsc
npm run lint       # eslint
```

## Background removal

Two places offer it. In the editor, select an image and press "Remove background" in the toolbar, the side panel or the right click menu. The cutout replaces the image as one undo step, and the same button puts the background back. On the Background Remover page, drop, paste or pick as many pictures as you like. They are cut out one after another, the strip on the left switches between them (or use the left and right arrow keys), a line over the picture compares the cutout with the original, restore and erase brushes fix what the model got wrong, and the panel on the right downloads the one you are looking at as PNG or WebP at any size, or all of them at once as a ZIP.

It runs entirely in the browser, on WebGPU where the browser allows it and on WebAssembly otherwise. Three models from the open source [rembg](https://github.com/danielgatis/rembg) project ship with the site, and the gear in the top right picks one: Light (u2netp, 5 MB, quick but rough), Effective (silueta, 44 MB) and Best (isnet-general-use, 179 MB, the cleanest edges). Best is the default and downloads on the first use. Picking another model downloads it right away and removes the one picked before, and "Delete current model" removes the picked one from the computer, after which the next removal starts from the default again. There is no server side to it, so the hosted version has it too, and nothing you add to the remover page is kept once you leave.

## Shortcuts

The single letter keys can be changed or cleared under Keybinds in the settings. They never fire while you type.

| Keys | Action |
| --- | --- |
| Ctrl+Z, Ctrl+Shift+Z | Undo, redo |
| Ctrl+S | Save |
| Ctrl+A | Select all |
| Ctrl+C, Ctrl+V | Copy, paste (also pastes images from the clipboard) |
| Ctrl+D | Duplicate |
| Delete | Remove selection |
| Arrows, Shift+Arrows | Nudge by 1 px or 10 px |
| S, T, H, D, U | Select, text, shapes, draw, upload |
| R | Remove or restore the background of the selected image |
| Enter, Backspace, Escape | While drawing: finish the shape, take a corner back, start over |
| Ctrl+Plus, Ctrl+Minus, Ctrl+0 | Zoom in, zoom out, fit |
| Escape | Deselect or finish editing text |
| Ctrl+Wheel | Zoom around the pointer |
| Wheel | Pan |

## How the code is organised

Next.js 15 with the App Router. Four routes: `/` (your projects), `/remove-bg` (batch background removal), `/new` (pick a size) and `/editor/[projectId]`.

- `src/model`: the project, page and element types, plus factories.
- `src/data`: presets, fonts, colours and shape geometry, including the point lists and paths behind every shape.
- `src/lib`: browser free helpers: geometry, snapping, IndexedDB, ZIP writing, image loading, popover and toolbar placement, colour extraction, grid snapping and rounded corner paths for shapes, and the export renderer under `src/lib/export`. `src/lib/background` holds the cutout model's maths and the worker that runs it, `src/lib/remove-bg` the sizing and download helpers of the background remover.
- `src/store`: the zustand stores. `project-store` holds the open project, selection, live previews and undo history and is split into slices. `editor-ui-store` holds tool, panel, zoom, pan and the open menus.
- `src/services/background-removal.ts`: the main thread side of the remover. It starts the worker and hands it pictures one at a time.
- `src/hooks`: React hooks for saving, autosave, shortcuts, theme, settings, live updates and the removal queue.
- `src/components`: UI. `editor/canvas` is the Konva stage with the quick toolbar and the context menu, `editor/panels` the side panel, `remove-bg` the batch cutout page and `site` the bar with the two sections.

Every file stays small and does one thing. The export renderer and the live canvas share the same attribute builders in `src/lib/konva/element-attrs.ts`, so what you see is what you export.

## Licence

MIT.
