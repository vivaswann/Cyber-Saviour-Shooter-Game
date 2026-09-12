# VIVASWAN.EXE

Open `index.html` in a modern browser, or serve this folder with any static server (for example `python -m http.server`). The game uses only native HTML Canvas and ES modules.

**Controls:** WASD / arrow keys move, mouse or Space fires, `R` switches between CODE rifle and RPG, `1`-`3` select terminal upgrades, and `Enter` reboots after game over.

Waves use the exact progression rules: base enemy counts are Wave 1 = 3, Wave 2 = 5, Wave 3 = 6, Wave 4 = 8, Wave 5 = 10, then procedural growth adds 3 enemies per wave; `hpMultiplier = Math.pow(1.12, wave - 1)`; `speedMultiplier = 1 + Math.min(1.5, (wave - 1) * 0.08)`. Every fifth wave adds an elite; every tenth adds a KERNEL PANIC boss. The roster includes MALWARE, MEMORY_LEAK acceleration, SEGFAULT dash, ERROR, BUG, 404 teleport, and NULL POINTER split behavior.
