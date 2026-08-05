# Kortkommandon (full lista)

| Tangent | Funktion |
|---------|----------|
| `Space` | Command Palette |
| `/` | Sök |
| `Esc` | Stäng paneler/avmarkera (dubbel-Esc återställer vy) |
| `A` | AI Chat |
| `B` | AI Panel |
| `E` | Quote Extractor |
| `F` | Fokus på sök |
| `N` | Nytt kort |
| `I` | Import (bild/JSON/HTML/PDF/RIS) |
| `M` | Massimport (text -> kort) |
| `S` | Session-panel |
| `K` | Växla canvas/kolumnvy |
| `W` | Wandering-läge + trail-panel (experiment, avstängt som standard) |
| `[` | Wandering: bakåt i trail (experiment, bara när wandering-flaggan är på) |
| `]` | Wandering: framåt i trail (ej implementerat, fångas inte i stabilt läge) |
| `O` | Visa bildsida på bildkort |
| `O` + `O` | Visa text på bildkort |
| `Z` | Zen mode |
| `-` | Fit all (zoomar till synliga kort) |
| `0` | Reset zoom till 100% |
| `L` | Toggle synapse-linjer |
| `P` | Pin/unpin kort |
| `C` | Duplicera markerade |
| `Q` | Stack/cirkel |
| `V` | Arrangera vertikalt |
| `H` | Arrangera horisontellt |
| `G` | Grid vertikal (släpp G med markering) |
| `G+V` | Grid vertikal |
| `G+H` | Grid horisontell |
| `G+T` | Kanban |
| `G+C` | Centralitet |
| `Ctrl+Enter` | Spara |
| `Ctrl+C/V` | Kopiera/Klistra kort |
| `Ctrl+Z/Y` | Undo/Redo |
| `Ctrl+A` | Markera alla (synliga) |
| `Ctrl+Ö` / `Ctrl+Backquote` | Toggle Selection Scope Panel |
| `Delete/Backspace` | Radera (session-aware) |
| `Ctrl+Delete/Backspace` | Radera permanent |
| `Alt+E` | Eternal view (canvas) |
| `Alt+L` | Week view (canvas) |
| `Alt+1-6` | Kolumnvy med 1-6 kolumner |
| `Alt+D` | Markera kort från idag |
| `Alt+W` | Markera kort från denna vecka |
| `Alt+N` | Markera kort från nästa vecka |
| `D` (håll) + klick | Skapa sekvenskedja |
| `Ctrl+scroll` | Justera graph gravity (experiment, avstängt som standard) |
| `Alt+scroll` | Panorera canvas |

Noteringar:
- Delete i session tar bort kort från sessionen. I "Alla kort" blir det permanent (med bekräftelse).
- `Ctrl+Backquote` fungerar även för internationella tangentbord (`IntlBackslash`/`Backquote`).
- Wandering/trails och graph gravity/layout är inte del av stabil lokal v1-planen. De finns kvar bakom feature flags i Settings > Debug.

Tema byts via Command Palette (sök "theme").
