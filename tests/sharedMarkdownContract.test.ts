import { describe, expect, it } from 'vitest';
import {
  normalizeTags,
  parseOmnicalMarkdown,
  stableTextHash,
  writeSharedMarkdown,
} from '../src/utils/omnicalNotes';

// Kontraktstest mot Omnical. Se docs/shared-markdown-contract.md.
//
// Omnical har ett spegelvänt test, src/lib/shared-markdown-contract.test.ts,
// med exakt samma fixturblock nedan. Failar något här har den här appen glidit
// ifrån den andra — och båda skriver i samma .md-filer, så det slutar med att
// användarens anteckningar förstörs.

// Blocket mellan markörerna nedan är byte-identiskt med motsvarande block i
// Omnicals src/lib/shared-markdown-contract.test.ts. Ändrar du något där inne,
// kopiera hela blocket dit i samma arbetspass — annars mäter de två testerna
// inte längre samma sak, och hela poängen är borta.

// ─────────── DELAT FIXTURBLOCK ───────────

/** FNV-1a-värden. Båda apparna sparar hashen som synkbaslinje på disk — ändras
 *  algoritmen blir varje sparad baslinje ogiltig. Uppdatera aldrig de här
 *  värdena för att få testet grönt; är de fel är implementationen fel. */
const HASH_GOLDEN: Array<[string, string]> = [
  ["", "811c9dc5"],
  ["a", "e40c292c"],
  ["Brödtext", "6a35a580"],
  ["möte med föräldrar #skola", "3aa6bf1b"],
];

/** Nycklar Omnical äger och skriver om. */
const OMNICAL_OWNED_KEYS = [
  "omnicalId", "date", "created", "updated", "trackId", "område",
  "activityId", "tags", "done", "sources", "remindAt", "archived",
  "omnicalDraft",
];

/** De sex Soul skriver i en delad anteckning. Alla ägs även av Omnical. */
const SOUL_WRITTEN_KEYS = ["tags", "done", "archived", "område", "remindAt", "updated"];

/** Omnicals ensamma. Soul får aldrig skriva någon av dem. */
const OMNICAL_ONLY_KEYS = [
  "omnicalId", "date", "created", "trackId", "activityId", "sources", "omnicalDraft",
];

/** Souls egen nyckel. Måste överleva som främmande frontmatter genom Omnicals
 *  omskrivningar, annars fastnar delade kort på "Väntar på Omnical". */
const SOUL_FOREIGN_KEYS = ["soulCardId"];

/** En delad anteckning som båda apparna ska klara: Omnicals fält, Souls egen
 *  nyckel, och en nyckel någon lagt till för hand i Obsidian. */
const SHARED_NOTE = [
  "---",
  'omnicalId: "note-1"',
  'date: "2026-08-10"',
  'created: "2026-08-10T08:00:00.000Z"',
  'updated: "2026-08-10T08:00:00.000Z"',
  'trackId: ""',
  'område: "Skola"',
  'activityId: ""',
  'tags: ["skola","möte"]',
  "done: false",
  "sources: []",
  'remindAt: ""',
  "archived: false",
  "soulCardId: card-1",
  "egenNyckel: behåll mig",
  "---",
  "",
  "Brödtext med #inline",
  "",
].join("\n");

/** Samma anteckning med taggarna som YAML-blocklista — så skriver Obsidian
 *  dem när man redigerar properties i UI:t. Båda formerna måste läsas. */
const BLOCK_LIST_NOTE = [
  "---",
  'omnicalId: "note-2"',
  'date: "2026-08-10"',
  'created: "2026-08-10T08:00:00.000Z"',
  'updated: "2026-08-10T08:00:00.000Z"',
  "tags:",
  "  - skola",
  "  - möte",
  "done: false",
  "archived: false",
  "---",
  "",
  "Brödtext",
  "",
].join("\n");

/** Handskrivna enkla citattecken — så ser det ut när någon redigerat
 *  properties för hand i Obsidian i stället för via dess UI. Här skiljer sig
 *  apparna åt med flit, och varje repo låser sitt eget beteende nedan. */
const HAND_QUOTED_NOTE = [
  "---",
  'omnicalId: "note-3"',
  'date: "2026-08-10"',
  'created: "2026-08-10T08:00:00.000Z"',
  'updated: "2026-08-10T08:00:00.000Z"',
  "område: 'Skola'",
  "remindAt: '2026-09-01'",
  "done: false",
  "archived: false",
  "---",
  "",
  "Brödtext",
  "",
].join("\n");

// ─────────── SLUT PÅ DELAT FIXTURBLOCK ───────────

/** Frontmatter-rader som en nyckel→rad-karta, för att se vad en skrivning rörde. */
function fieldsOf(lines: string[]): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of lines) {
    const key = line.match(/^([^\s:#][^:]*):/)?.[1].trim();
    if (key && !fields.has(key)) fields.set(key, line);
  }
  return fields;
}

/** Frontmatter-raderna ur en skriven fil, utan `---`-avgränsarna. */
function frontmatterOf(markdown: string): string[] {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1].split('\n') : [];
}

describe('delat kontrakt: hashen', () => {
  it.each(HASH_GOLDEN)('hashar %j till %s', (value, expected) => {
    expect(stableTextHash(value)).toBe(expected);
  });
});

describe('delat kontrakt: ägda nycklar', () => {
  const note = parseOmnicalMarkdown(SHARED_NOTE, 'note-1.md')!;

  it('skriver bara de sex delade nycklarna', () => {
    // Allt ändras på en gång — done, taggar, område, remindAt — så varje fält
    // Soul kan tänkas röra får chansen att synas i diffen.
    const written = writeSharedMarkdown(
      note,
      note.body,
      ['skola', 'möte', 'nytt'],
      { done: true, archived: true, area: 'Fritid', remindAt: '2026-09-01' },
      '2026-08-10T09:00:00.000Z',
    );
    const before = fieldsOf(note.frontmatterLines);
    const after = fieldsOf(frontmatterOf(written));

    const changed = [...after].filter(([key, line]) => before.get(key) !== line).map(([key]) => key);
    expect(changed.length, 'skrivningen ändrade ingenting — testet mäter inget').toBeGreaterThan(0);
    for (const key of changed) {
      expect(SOUL_WRITTEN_KEYS, `Soul ändrade "${key}", som inte är en delad nyckel`).toContain(key);
    }
    // Och inget försvann: främmande nycklar finns kvar efteråt.
    for (const key of before.keys()) {
      expect([...after.keys()], `"${key}" försvann vid skrivning`).toContain(key);
    }
  });

  it('rör aldrig en nyckel som är Omnicals ensam', () => {
    for (const key of OMNICAL_ONLY_KEYS) {
      expect(SOUL_WRITTEN_KEYS, `"${key}" är Omnicals att minta`).not.toContain(key);
    }
  });

  it('håller de delade nycklarna inom Omnicals ägda lista', () => {
    for (const key of SOUL_WRITTEN_KEYS) {
      expect(OMNICAL_OWNED_KEYS, `Omnical äger inte "${key}"`).toContain(key);
    }
  });

  it('räknar soulCardId som främmande, inte ägd', () => {
    for (const key of SOUL_FOREIGN_KEYS) {
      expect(OMNICAL_OWNED_KEYS).not.toContain(key);
    }
  });
});

describe('delat kontrakt: främmande frontmatter', () => {
  it('bevarar Souls och Obsidians nycklar vid läsning', () => {
    const note = parseOmnicalMarkdown(SHARED_NOTE, 'note-1.md')!;
    expect(note.frontmatterLines).toContain('soulCardId: card-1');
    expect(note.frontmatterLines).toContain('egenNyckel: behåll mig');
  });

  it('skriver tillbaka dem oförändrade', () => {
    const note = parseOmnicalMarkdown(SHARED_NOTE, 'note-1.md')!;
    const written = writeSharedMarkdown(note, note.body, note.tags, {
      done: note.done,
      archived: note.archived,
      area: note.area,
      remindAt: note.remindAt,
    });
    expect(written).toContain('soulCardId: card-1');
    expect(written).toContain('egenNyckel: behåll mig');
  });
});

describe('delat kontrakt: handskrivna citattecken', () => {
  // Låser Souls nuvarande beteende, inte ett önskat. Soul strippar
  // citattecknen, Omnical behåller dem — en dokumenterad skillnad som INTE är
  // beslutad. Failar det här testet efter en ändring är det förmodligen rätt
  // sak att göra, men den ändringen skriver om befintliga filer vid nästa
  // synk. Kräver Simons uttryckliga beslut, och Omnicals spegeltest
  // (src/lib/shared-markdown-contract.test.ts) ska ändras i samma commit.

  it('strippar citattecknen ur värdet', () => {
    const note = parseOmnicalMarkdown(HAND_QUOTED_NOTE, 'note-3.md')!;
    expect(note.area).toBe('Skola');
    expect(note.remindAt).toBe('2026-09-01');
  });

  it('skriver tillbaka värdet utan de handskrivna citattecknen', () => {
    // Det här är kostnaden åt andra hållet: Soul normaliserar redan bort dem,
    // så filen ändras vid nästa skrivning oavsett vad Omnical gör.
    const note = parseOmnicalMarkdown(HAND_QUOTED_NOTE, 'note-3.md')!;
    const written = writeSharedMarkdown(note, note.body, note.tags, {
      done: note.done,
      archived: note.archived,
      area: note.area,
      remindAt: note.remindAt,
    });
    expect(written).toContain('område: "Skola"');
    expect(written).toContain('remindAt: "2026-09-01"');
  });
});

describe('delat kontrakt: taggar', () => {
  it('läser inline-listan och slår ihop med #taggar i texten', () => {
    const note = parseOmnicalMarkdown(SHARED_NOTE, 'note-1.md')!;
    expect(note.tags).toEqual(['skola', 'möte', 'inline']);
  });

  it('läser Obsidians blocklista likadant', () => {
    const note = parseOmnicalMarkdown(BLOCK_LIST_NOTE, 'note-2.md')!;
    expect(note.tags).toEqual(['skola', 'möte']);
  });

  it('normaliserar taggar likadant oavsett var de kom ifrån', () => {
    expect(normalizeTags(['#skola', 'Skola', 'möte'])).toEqual(['skola', 'möte']);
  });
});
