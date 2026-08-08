# Kortkommandon, palettkommandon och högerklicksmenyer (full lista)

Verifierad mot koden 2026-08-08 (`useKeyboard.ts`, `CommandPalette.tsx`, `ContextMenu.tsx`, `KonvaCanvas.tsx`).

## 1. Tangentbordsgenvägar

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
| `Ctrl+A` | Markera alla |
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
- Command Palette-posterna "Scope +1" till "Scope +6" har inget kortkommando ännu (Alt+1–6 är redan upptaget av kolumnvy-växlingen ovan) — går bara att köra via klick/Enter i paletten. En egen genväg kan läggas till senare.

Tema byts via Command Palette (sök "theme").

## 2. Musgester (canvas)

| Gest | Funktion |
|------|----------|
| Högerklick på tom canvas | Öppnar Command Palette |
| Long-press (touch) på tom canvas | Öppnar Command Palette |
| Högerklick på ett kort | Öppnar kortmenyn (se avsnitt 4) |
| Dubbelklick på tom canvas | Nytt kort |
| Dubbelklick på ett kort | Öppnar kortet för redigering |

## 3. Command Palette — alla kommandon

Öppnas med `Space`, högerklick, eller long-press på tom canvas. Sökbar på namn och kortkommando.

### AI
| Kommando | Kortkommando | Beskrivning |
|---|---|---|
| Open AI Panel | `b` | Opens the AI panel for embeddings, tagging, and reflection tools. |
| AI Chat (manual provider) | `a` | Starts a manual AI chat session using your chosen provider. |
| AI Quote Extractor | `e` | Extracts quotable passages from selected notes using AI. |
| Edit OCR Prompt | `ocr` | Edits the prompt used for OCR text extraction from images. |
| Generate Embeddings | `emb` | Generates AI embeddings for all cards to enable similarity search. |
| Auto-Link Similar *(kräver `enableAutoLink`)* | `link` | Automatically creates links between semantically similar cards. |
| AI Reflection | `ref` | Runs an AI reflection pass over your notes to surface insights. |
| Generate Tags | `tag` | Generates AI tags for the selected cards. |

### View
| Kommando | Kortkommando | Beskrivning |
|---|---|---|
| Eternal Canvas View | `alt+e` | Switches to a continuous, session-independent canvas view. |
| Center Camera (0,0) | — | Moves the camera back to the canvas origin. |
| Fit All Nodes | `-` | Zooms and pans to fit every card on screen. |
| Toggle Zen Mode | `z` | Hides UI chrome for a distraction-free view. |
| Change Theme | — | Cycles to the next visual theme. |
| Reset Zoom | `0` | Resets the zoom level to 100%. |
| Toggle View Mode (Canvas/Column) | `k` | Switches between the canvas and column layouts. |
| Toggle Session Panel | `s` | Shows or hides the session panel. |
| Toggle Scope Panel | `ctrl+\`` | Shows or hides the selection scope panel. |
| Toggle Wandering Mode *(experiment, om aktivt)* | `w` | Toggles autonomous wandering through linked cards. |
| Toggle Synapse Lines | `l` | Shows or hides connection lines between linked cards. |
| Scope +1 … +6 | — *(inget kortkommando ännu)* | Expands the selection scope by N connection degrees. |

### Create / Arrange (edit-kategorin)
| Kommando | Kortkommando | Beskrivning |
|---|---|---|
| New Card | `n` | Creates a new empty card on the canvas. |
| Import (Images, JSON, Zotero, Markdown) | `i` | Imports cards from images, JSON, Zotero, or Markdown files. |
| Mass Import (Text) | `m` | Bulk-creates cards from pasted text. |
| Focus Search | `f` | Moves keyboard focus to the search field. |
| Arrange Vertical | `v` | Lines up the selected cards in a vertical column. |
| Arrange Horizontal | `h` | Lines up the selected cards in a horizontal row. |
| Arrange Stack | `q` | Stacks the selected cards on top of each other. |
| Arrange Grid Vertical | `g+v` | Arranges the selected cards in a vertical grid. |
| Arrange Grid Horizontal | `g+h` | Arranges the selected cards in a horizontal grid. |
| Arrange Overlapping Rows | `g+t` | Arranges cards in overlapping rows, kanban-style. |
| Arrange Grid Centrality | `g+c` | Arranges cards in a grid ordered by network centrality. |

### Edit
| Kommando | Kortkommando | Beskrivning |
|---|---|---|
| Copy Selected | `ctrl+c` | Copies the selected cards to the clipboard. |
| Duplicate Selected | `c` | Creates a duplicate of the selected cards. |
| Paste | `ctrl+v` | Pastes cards from the clipboard onto the canvas. |
| Undo | `ctrl+z` | Reverts the last action. |
| Redo | `ctrl+y` | Re-applies the last undone action. |
| Select All | `ctrl+a` | Selects every card on the canvas. |
| Clear Selection | `esc` | Deselects all currently selected cards. |
| Remove from Session | `del` | Removes the selected cards from the active session without deleting them. |
| Delete Permanently | `ctrl+del` | Permanently deletes the selected cards from all sessions. Cannot be undone. |
| Pin/Unpin Selected | `p` | Toggles the pinned state of the selected cards. |
| Flip Images to Text (Selected/All) | `o+o` | Converts image cards to text cards. |
| Flip Images to Image (Selected/All) | `o` | Converts text cards to image cards. |

### File
| Kommando | Kortkommando | Beskrivning |
|---|---|---|
| Save | `ctrl+enter` | Saves the current state to disk. |
| Export to Cytoscape (SIF) | `sif` | Exports the graph as a Cytoscape SIF file. |
| Export to Cytoscape (CSV) | `csv` | Exports the graph as a Cytoscape CSV file. |
| Settings | — | Opens the app settings. |

## 4. Högerklick på ett kort (kortmeny)

Alla poster nedan är villkorade — vissa syns bara beroende på markering, korttyp eller vilka callbacks som är kopplade i `App.tsx`.

| Kommando | Villkor |
|---|---|
| Vänd kort | Alltid |
| 🔄 Vänd alla markerade (N) | Fler än 1 bildkort markerat |
| 🔍 Läs & beskriv bild(er) | Kortet (eller markeringen) är en bild |
| Pinna / Avpinna | Alltid |
| 🧠 Auto-tagga | Om `onAutoTag` är kopplad |
| 🏷️ Tagga markerade (N) | Om `onTagSelected` är kopplad och något är markerat |
| AI: Summera → kommentar | Om `onSummarize` är kopplad |
| AI: Föreslå rubrik | Om `onSuggestTitle` är kopplad |
| Värde (1–6) *(undermeny)* | Alltid — sätter eller rensar kortets värde |
| Accentfärg *(undermeny)* | Alltid — 8 färger + rensa |
| 🧲 Liknande | Om `onAttractSimilar` är kopplad och kortet/markeringen har embeddings |
| 💬 Chatta om valda | Om `onOpenAIChat` är kopplad |
| 📌 Lägg till i chat | Om `onAddToChat` är kopplad |
| 📤 Ta bort från session | Bara när en session är aktiv |
| Dela med Omnical / Väntar på Omnical / Omnical-fil saknas / Delad med Omnical | Bara textkort, bara när `enableOmnicalSharedNotes`-flaggan är på |
| Radera | Alltid — raderar kortet permanent |

Noteringar:
- Kortmenyn öppnas med högerklick **på ett kort**. Högerklick på tom canvas öppnar istället Command Palette (avsnitt 2).
- Menytexterna i kortmenyn är fortfarande på svenska (till skillnad från Command Palette, som gjordes om till engelska).
