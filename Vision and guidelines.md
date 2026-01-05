LEGACY / HISTORICAL DOCUMENT
This file is kept for historical context. For current guidance see README.md and CLAUDE.md.

🌌 Soul Canvas – Visionärt & Tekniskt Manifest
1. Visionen: Från "Second Brain" till "Zen Master"
Detta är inte en produktivitetsapp. Det är en digital förlängning av medvetandet. Vi bygger inte en att-göra-lista, utan en oändlig duk för kontemplation och mönsterigenkänning.

Kärnfilosofi
Organiskt Liv: Tankar är inte statiska block; de är levande objekt som påverkas av krafter (fysik). De ska "andas" och hitta sin egen plats.

Semantisk Gravitation: Lika barn leka bäst. I framtiden ska tankar som handlar om samma sak dras till varandra av sig själva, inte för att vi sorterat dem, utan för att AI:n förstår innebörden.

Tiden som Dimension: Vi vill se tidens gång. Gamla tankar ska sjunka undan, blekna eller bli "spöken" i bakgrunden, medan nya tankar brinner klart (Supernova-effekten).

AI som Terapeut: Systemet ska inte bara lagra data, det ska ställa frågor. "Jag ser att du ofta skriver om 'Frihet' när du är i skogen. Varför?"

2. Framtidsplanen (Roadmap)
Fas 1: Den Robusta Grunden (Här är vi nu) 🏗️
Gå från enskild fil (.json) till Mapp-baserat system (data.json + assets/-mapp) för att hantera bilder effektivt.

Fullständigt stöd för "Drag-and-Drop" av bilder och textfiler (Zotero-anteckningar).

Stabil OCR-funktionalitet via Gemini API.

Fas 2: Den Intelligenta Motorn (AI) 🧠
Lokala Embeddings: Implementera en lokal AI (via transformers.js eller liknande) som omvandlar varje kort till en vektor.

Auto-Koppling: En funktion som drar synapser (linjer) mellan kort som är semantiskt lika.

Sökning via Koncept: Sök inte på ord, sök på känsla eller innebörd.

Fas 3: Hårdvaran & Taktiliteten 📱
E-Ink Optimering: Ett "High Contrast"-läge utan animationer, perfekt för läsplattor i solljus.

Touch-Interface: Förbättrad "pinch-to-zoom" och panorering för surfplattor.

3. Teknisk Arkitektur & Stack
Vi bygger med Local-First som princip. Datan tillhör användaren, inte molnet.

Tech Stack
Kärna: React + Vite + TypeScript.

State Management: Zustand (för "Hjärnan" - globalt tillstånd).

Fysik: d3-force (simulerar gravitation, kollisioner och länk-krafter).

Styling: Tailwind CSS (med stöd för dynamiska teman).

Lagring: File System Access API (direkt till disk) + IndexedDB (idb-keyval) för att minnas sessioner.

AI: Google Gemini API (via generative-ai SDK) för OCR och bildanalys.

Kod-Struktur (Best Practices)
För att undvika "spaghetti-kod" följer vi strikt separation of concerns:

src/types/types.ts: Vår "Lagbok". Här definieras alla datamodeller (MindNode, Synapse, Theme). Inget får existera i appen om det inte är definierat här.

src/store/useBrainStore.ts: Appens hippocampus. Här bor all data och alla funktioner som ändrar data (addNode, updateNode, toggleSelection).

src/hooks/: Specialiserad logik.

useFileSystem.ts: Sköter all kommunikation med hårddisken.

useAppShortcuts.ts: Centraliserad hantering av tangentbordet.

src/components/: Endast visuella delar.

NodeView.tsx: Rendera ett enskilt kort.

AppMenu.tsx: UI för knappar och inställningar.

src/App.tsx: Dirigenten. Kopplar ihop Store, Fysik och Komponenter.

4. Filsystem & Data-format
Vi migrerar mot en mapp-struktur för att vara framtidssäkra.

Fysisk struktur på disken:
Plaintext

Min Soul Canvas (Mapp)
│
├── data.json        // Håller all textdata, positioner och kopplingar
└── assets/          // Undermapp
    ├── image_123.jpg
    ├── image_456.png
    └── ...
Datamodell (JSON-struktur):
TypeScript

interface MindNode {
  id: string;
  type: 'text' | 'image' | 'zotero';
  content: string;         // Textinnehåll ELLER sökväg till bild ("assets/fil.jpg")
  x: number; y: number;    // Position
  tags: string[];          // Metadata
  createdAt: string;       // ISO Timestamp (för tids-visning)
  
  // Baksidan av kortet (dold metadata)
  ocrText?: string;        // AI-läst text
  comment?: string;        // Användarens bildtext
  isFlipped?: boolean;     // UI-state
}

interface Synapse {
  id: string;
  sourceId: string;        // Från Node ID
  targetId: string;        // Till Node ID
  strength: number;        // Hur stark är kopplingen?
}
5. Spelregler & Interaktion ("The Laws of Physics")
Fysiken
Dynamisk Gravitation: Användaren kan styra gravitationskraften (Shift + Scroll).

Låg gravitation: Noder repellerar varandra kraftigt (Explosion).

Hög gravitation: Noder dras hårt mot mitten.

Kollisioner: Bilder är "större" än textkort. Fysikmotorn har dynamiska radier för att undvika överlappning.

Interaktioner
Markera: Shift + Klick eller Ctrl + Klick.

Koppla (Synaps): Markera flera kort -> Tryck Q.

Spara: Autosave vid inaktivitet (Debounce 2s) eller Ctrl + Enter.

Zen Mode: Tryck Z för att dölja allt UI.

AI-Analys: Högerklicka på bild -> "AI: Läs text".

Teman
Vi stöder "Hot Swapping" av teman via src/themes.ts.

Space: Mörk, glödande, pulserande (Supernova/Stjärnor).

Paper: Ljus, taktil, serif-typsnitt, rutnät.

E-ink: Svartvitt, högkontrast, ingen animation, streckade linjer för ålder.
