# Princess Treasure Game

A two-player hide-and-seek treasure game for the browser (Vite + TypeScript + Three.js).

```bash
npm install
npm run dev      # play locally at http://localhost:5173
npm run build    # static site in dist/ (works on Vercel, Netlify or GitHub Pages)
```

## Progress (build order from the brief)

- [x] 1. Scene, camera, and one princess walking around the garden
- [ ] 2. Hiding spots and the hide/pick-up action
- [ ] 3. Turn flow: Hider turn, eyes-closed screen, Seeker turn, Princess celebration, role swap
- [ ] 4. Second princess model, scoring, sound effects, and polish
- [ ] 5. v2 bonus rules (only after a child can play v1 start to finish without help)

## Controls

- Arrow keys or WASD on a keyboard
- On-screen joystick on touch screens (bottom-left)

## Code map

- `src/main.ts` – renderer, lights, follow camera, game loop, collision
- `src/garden.ts` – castle garden: fountain, castle and towers, hedges, bushes, trees, benches, sparkles
- `src/princess.ts` – stylised low-poly princess with procedural idle/walk animation (two looks: `ROSE`, `LILAC`)
- `src/input.ts` – keyboard + touch joystick
