# The Crown Room — Immersive Lagos Hair Atelier

A responsive, editorial salon site with a procedural Three.js salon interior, custom campaign photography and a keyboard-accessible 3D tour. The salon room is built from code (no external model downloads); generated salon imagery is used for the visual campaign and wall art.

## Run locally

```sh
npm install
npm run dev
```

Vite serves the site at `http://localhost:4173`. Create a production bundle with `npm run build`.

## Interactive experience

- Drag / swipe to orbit, switch to an interior 360° view, use wheel or zoom controls, and navigate with arrow keys or Home when the canvas is focused.
- Enter the salon tour to reveal clickable braid, wash-care and finish-bar hotspots; use full screen or compatible WebXR VR when supported.
- Switch between daylight and after-dark lighting, hear an optional generated room tone or browser voice tour, or reset the camera. Audio never starts without a user action.
- Build a personal lookbook by dragging styles to the moodboard or tapping Save; selections persist in local storage and prefill the appointment notes.
- Use the two-step hair finder to get a suggested ritual and prefill the booking form.
- Open the full-screen lookbook and browse with arrows, thumbnails, keyboard or swipe.
- Explore scroll-linked 3D camera motion, the floating nav, progress indicator, pointer light, magnetic calls to action, rotating client stories and FAQ accordion.

The page includes a photo-led fallback if WebGL is unavailable. The booking form is a front-end demo and does not transmit or store submissions. Connect it to the salon's booking inbox or appointment system before launch, and replace the sample contact details and starting prices with confirmed business information.
