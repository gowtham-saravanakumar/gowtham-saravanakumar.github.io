# Gowtham Saravanakumar — site v3

Your v2 site with the portfolio-page upgrades merged in. Theme, fonts, blog and SEO files are unchanged.

New files
- assets/css/systems.css — arena, 3D stack slides, layer slider, kinetic headings
- assets/js/systems.js — physics, draggable headings, slider sync

What changed
- index.html: new "Playground" physics arena (#arena) after the first band; new "Layers" section (#layers) holding #aboutDepth / #depthStack / .plane-1..4 / #stackCounter with four bespoke slides; About now shows a short statement linking to it; "Layers" added to nav.
- portfolio.js: exposes window.GowthamStack and fires a `stackchange` event so the slider stays in sync.
- blog.html and all 3 articles: load systems.css/js so headings get the same kinetic + draggable behaviour.

Deploy: upload the folder as-is (GitHub Pages works). Test locally with `python3 -m http.server`.
