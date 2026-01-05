# Soul Canvas

En lokal, canvas-baserad kunskapsyta för tusentals kort. Fånga idéer, se mönster och låt AI hjälpa dig att läsa, ordna och reflektera - utan molnberoenden.

## Varför Soul Canvas?
- Local-first: din data ligger i en mapp på disk.
- Skalar: Konva-canvas + viewport-culling för tusentals kort.
- Snabbt flöde: genvägar, arrangemang, minimap, zen mode.
- AI som medskapare: OCR, taggar, reflektioner, chat och semantisk sök.

## Snabbstart
```bash
npm install
npm run dev
```

Öppna i Chrome/Edge och välj en mapp.

## Krav
- Node 20+
- Chrome/Edge (File System Access API)

## Hur det används (kort)
1. Öppna en mapp; appen skapar `data.json` och `assets/`.
2. Byt huvudsessions i menyn uppe till vänster (separata mappar = separata `data.json`).
3. Skapa/importera kort (N, drag/drop, JSON, PDF, Zotero, massimport).
4. Organisera med sessions, taggar, arrangemang och sök.
5. Använd AI-panelen och chatten för OCR, taggar, sammanfattningar och reflektioner.
6. AI-exporter sparas automatiskt i `ai-exports/`.

## Funktioner i praktiken
- Canvas- och kolumnvy, zoom/pan, minimap, zen mode.
- Sessions/arbetsytor med taggfilter och sök utanför session.
- Arrangemang: vertikalt, horisontellt, grid, kanban, cirkel, centralitet.
- Import: bilder, JSON, PDF -> bildkort, Zotero HTML/notes, RIS/COinS metadata.
- AI: OCR (Gemini), taggning/reflektion/quotes (Claude), embeddings + semantisk sök (OpenAI), chat med Claude/OpenAI/Gemini.
- Wandering/trails och Selection Scope Panel för relationer.

## Snabba genvägar (urval)
| Tangent | Funktion |
|---------|----------|
| `Space` | Command Palette |
| `/` | Sök |
| `a` | AI Chat |
| `b` | AI Panel |
| `S` | Session-panel |
| `-` | Fit all |

Full lista: `docs/SHORTCUTS.md`.

## AI-nycklar
Lägg in nycklar via Settings i appen (lagras i webbläsaren).
- Gemini: OCR på bildkort.
- OpenAI: embeddings och semantisk sök.
- Claude: taggar, reflektioner, sammanfattningar och quote extractor.
- Chatten kan använda Claude/OpenAI/Gemini beroende på vald provider.
- OCR-modell väljs i Settings (Gemini).
- Chatmodeller väljs i chatten (default i `src/utils/chatProviders.ts`).

## Data och filstruktur
```
<din-mapp>/
  data.json
  assets/
    originals/
  ai-exports/
```

`assets/originals/` är backup för importer. `ai-exports/` innehåller textfiler per session.
`data.json` innehåller noder, synapser, sessioner, trails och konversationer.

## Data tools
`clean_json.py` rensar `data.json` genom att ta bort embeddings, de-dupa noder och nollställa `updatedAt`.
Windows-hjälpare: `clean_json.bat`.

```bash
python clean_json.py data.json
python clean_json.py data.json output.json
```

## Utveckling
- `npm run dev` startar Vite.
- `npm run test` kör vitest.
- `npm run lint` kör ESLint.
- `npm run build` bygger projektet.
- `npm run sanity` kör test + lint + build och skriver ut QA-checklistan.

## För AI-assistenter
Läs `CLAUDE.md` innan ändringar.

## Legacy
Historiskt manifest: `Vision and guidelines.md`.
