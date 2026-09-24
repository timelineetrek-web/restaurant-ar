# Restaurant AR Menu — Version 3

A small WebXR restaurant AR prototype using Three.js.

## Version 3 controls
- Find a horizontal surface and tap the blue ring to place the burger.
- One-finger drag: rotate the burger.
- Two-finger pinch: resize the burger.
- Tap the burger: select/deselect it.
- Remove food: removes the current burger so another can be placed.

## Run locally
```bash
python -m http.server 8000
```
Then open `http://localhost:8000/` on a desktop for the page UI. WebXR AR testing should be done on a compatible phone/browser over HTTPS.

## Deploy
The prototype can be deployed as static files using GitHub Pages or another HTTPS static host.
