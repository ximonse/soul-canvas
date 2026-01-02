# Soul Canvas

En lokal, canvas-baserad kunskapsyta för tusentals kort med AI-driven förståelse och organisation.

## Quick Start

```bash
npm install
npm run dev
```

Krav: Node 20+, Chrome/Edge (File System Access API).

## Tech Stack

- **React + TypeScript + Vite**
- **Konva** (canvas-rendering, skalar till tusentals kort)
- **Zustand** (state management)
- **AI**: Claude, OpenAI, Gemini (taggar, embeddings, reflektion, chat)

## Filstruktur

```
src/
  components/     # React/Konva-komponenter
  hooks/          # Custom hooks (logik)
  store/          # Zustand store
  utils/          # Hjälpfunktioner
  types/          # TypeScript-typer
```

Data sparas lokalt: `data.json` + `assets/`-mapp.

## Data tools

`clean_json.py` cleans/compresses `data.json` by removing `embedding`, de-duping nodes
by content or position, and resetting `updatedAt`. It writes `<input>_clean.json`
unless you pass an output path. Windows helper: `clean_json.bat` (drag/drop or run
`clean_json.bat file.json`).

```bash
python clean_json.py data.json
python clean_json.py data.json output.json
```

---

## För AI-assistenter

**LÄS FÖRST:** [`CLAUDE.md`](./CLAUDE.md)

Denna fil innehåller:
- Projektets kärnprinciper och slutvision
- Tekniska riktlinjer (skalbarhet, canvas-first, etc.)
- Komplett lista över kortkommandon
- Sessionsloggar med implementationsdetaljer
- Utvärderingskriterier för nya features

### Regler

1. **Max 300 rader per fil** - dela upp innan du lägger till kod
2. **Canvas-first** - inga DOM-element per kort (skalar inte)
3. **Fråga innan nya kortkommandon** - kolla vilka som är upptagna
4. **Pusha aldrig utan att fråga**

### Workflow

```
1. Läs CLAUDE.md
2. Kolla wc -l på filer du ska ändra
3. Om fil > 200 rader: fråga om refaktorering först
4. Koda när du fått OK
5. Fråga innan git push
```

---

## Kortkommandon (urval)

| Tangent | Funktion |
|---------|----------|
| `Space` | Command Palette |
| `a` | AI Chat |
| `b` | AI Panel |
| `/` | Sök |
| `v` / `h` | Arrangera vertikalt/horisontellt |
| `g+v` / `g+h` | Grid layout |
| `-` / `0` | Fit all / Reset zoom |
| `N` / `I` | Nytt kort / Import |

Se `CLAUDE.md` för komplett lista.
