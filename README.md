# celligames

Monopage for all my games: a single, full-screen page (no scrolling, desktop and mobile) where each game is shown inside an arcade cabinet.

## Features

- **Category tabs** at the top (`Games`, `Boardgames` – the latter is disabled for now).
- **Looping 3D carousel** of cabinets: arrows, dots, keyboard (← →), mouse drag, touch swipe and trackpad horizontal swipe.
- **Arcade cabinet** for every game: illuminated marquee with the logo, CRT screen, joystick and buttons, coin door.
- **Screen media**: a video (YouTube link or video file, autoplay, muted, looping) or a set of screenshots that crossfade. YouTube videos show only the picture: no title, logo, controls, end screen or suggested videos.
- **Info panel** next to the cabinet (below it on mobile): genres as colored chips, number of players, languages (flags), description and the *Insert coin / Play now* button.
- **Insert coin sequence**: clicking *Play now* (or the coin door) zooms onto the coin slot, drops a coin with a short arcade sound, shows `CREDIT 01`, zooms into the screen and opens the game. Ctrl/Cmd/middle click opens the game in a new tab without the animation.
- **IT / EN language switch** (top right): changes every text instantly. The default comes from the browser language; the choice is remembered.
- Themed favicon and Apple touch icon.

## Project structure

```
index.html            page markup and the cabinet <template>
style.css             all styles (layout, cabinet, carousel, animations)
app.js                carousel, i18n, media, insert-coin sequence
games.js              the games list (data only)
assets/<game-id>/     logo and screenshots of each game
favicon.svg
apple-touch-icon.png
```

No build step and no dependencies: plain HTML, CSS and JavaScript.

## Adding or editing a game

Games live in `games.js` (JSON syntax inside `window.GAMES = …`, so the page also works when opened from disk). Each entry:

```js
{
  "id": "mygame",                              // folder name under assets/
  "name": "My Game",                           // marquee alt text and info panel title
  "url": "https://mygame.example.com",         // where Play now leads
  "players": 2,                                // max players (1–4); shown as "1" or "1–N"
  "genres": [                                  // one colored chip each
    { "it": "Avventura", "en": "Adventure" }
  ],
  "languages": ["it", "en"],                   // shown as flags
  "logo": "assets/mygame/logo.svg",
  "video": "https://youtu.be/VIDEO_ID",        // optional, has priority over screens
  "description": {
    "it": "Testo in italiano.",
    "en": "English text."
  },
  "screens": [                                 // used when there is no video
    "assets/mygame/screen-1.png",
    "assets/mygame/screen-2.png"
  ]
}
```

Notes:

- **Video** accepts any YouTube link format (`youtu.be/…`, `watch?v=…`, `shorts/…`) or a direct file (`.mp4`, `.webm`, `.ogv`, `.mov`). The YouTube thumbnail is shown while the video loads.
- **Screenshots** fill the screen (cropped, aligned to the top, so portrait phone captures keep their header) and crossfade every 3.5 s when there is more than one.
- **Chip colors** are assigned in order to each distinct genre, so the same genre always has the same color across games.
- Text fields can be a plain string or an `{ "it", "en" }` object.

## Running locally

Open `index.html` directly in the browser: everything works without a server, **except YouTube videos**. YouTube refuses to embed in pages opened from disk (`file://`), so there the cabinet shows the video thumbnail as a still frame. To see the video locally either:

- serve the folder over http (e.g. VS Code *Live Server* → *Open with Live Server*), or
- use a local video file in `assets/` instead of a YouTube link.

## Deploy

Any static host works (Vercel, GitHub Pages, Netlify…): publish the repository root as is.

## Customizing

- **UI texts / translations**: the `I18N` object in `app.js`. Adding a language means adding an entry there, a button in the `.lang-switch` in `index.html` and its flag in `LANG_FLAGS`.
- **Colors**: CSS variables at the top of `style.css` (`--neon`, `--neon-2`, …) and `CHIP_COLORS` in `app.js`.
- **Timings**: `SCREEN_INTERVAL` (screenshot crossfade) in `app.js`; carousel and zoom durations in `style.css` (`.slide`, `.showcase`, `.stage` transitions).
- **Accessibility**: ambient animations (marquee glow, blinking lights, screenshot fades) are disabled with the OS "reduce motion" setting; navigation and the insert-coin sequence stay animated because they are user-triggered.
