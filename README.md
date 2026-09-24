# Restaurant AR Menu — Version 2

A simple WebXR restaurant AR prototype built with Three.js.

## Current features
- Android WebXR AR session
- Surface hit testing
- Blue placement reticle
- Tap-to-place a stylized 3D burger
- Self-contained burger model built from Three.js primitives
- No backend required

## Run locally
Use a local web server. For example:

```bash
python -m http.server 8000
```

Open `http://localhost:8000` in a browser.

For WebXR AR on a phone, deploy over HTTPS (for example GitHub Pages).

## Next planned features
- Realistic GLB food models
- Rotate with touch gestures
- Pinch to resize
- Remove/select food
- Multiple menu items
- Restaurant-specific QR links
