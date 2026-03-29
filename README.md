# qdrw

open → draw → paste into AI. that's it.

a zero-friction whiteboard for dropping visual context into LLM chats — wireframes, diagrams, quick sketches. no backend, no account, no friction.

→ **[kanywst.github.io/qdrw](https://kanywst.github.io/qdrw)**

---

## shortcuts

| key | action |
|-----|--------|
| `B` | brush |
| `E` | eraser |
| `Z` | undo |
| `C` | copy as PNG |
| `[` / `]` | thinner / thicker |
| `⇧C` | clear |

hover `?` in the toolbar for the full list.

---

## stack

- **Vite + React 18 + TypeScript**
- **Tailwind CSS v4** — OKLCH color system, P3 wide-gamut
- **perfect-freehand** — stroke smoothing
- **Motion** — spring physics animations
- **fast-check** — property-based testing

---

## dev

```sh
npm install
npm run dev
```

```sh
npm run build   # → dist/
npm test        # vitest
```
