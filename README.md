# RepRight Pro
A polished static fitness application built with HTML, CSS and vanilla JavaScript.

## Run
Open `index.html` in a modern browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Structure
- `index.html` – application shell
- `src/data.js` – exercise dataset
- `src/app.js` – navigation and interactions
- `src/styles.css` – responsive design system
- `images/` – real exercise start/end photos

## Production notes
This front-end version is ready as a clean deployable static application. For user accounts, saved plans, history synchronization, analytics, and media hosting, connect it to an API/backend and add authentication, validation, monitoring and tests.


## Complete exercise library
This build preserves all **67 exercise definitions** from the original RepRight application, including their original start/end image pairs, exercise instructions, benefits, primary and secondary muscles, equipment, location, and difficulty.


## Mobile improvements
- Mobile-first responsive layout for 320px+ screens
- Fixed bottom navigation
- Touch-friendly cards and controls
- Horizontally scrollable filters
- Bottom-sheet exercise details
- Sticky Add to Workout action
- Safe-area support for modern phones
