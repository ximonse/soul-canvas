# Det delade Markdown-kontraktet

**Den här filen finns i två repon och ska vara identisk i båda:**
`Omnical/docs/shared-markdown-contract.md` och
`soul-canvas/docs/shared-markdown-contract.md`.
Ändrar du den i det ena, ändra den i det andra i samma veva.

---

## Vad det handlar om

Omnical och Soul Canvas är två separata appar, och ska förbli det. Men de läser
och skriver **samma `.md`-filer** i en gemensam mapp (Omnical-mappen i vaulten).
Filerna redigeras dessutom av Obsidian, VS Code och för hand.

Det betyder att ett antal funktioner i de två repona måste bete sig likadant
utan att någon kompilator eller typkontroll kan tvinga fram det. Glider de isär
förstörs användarens anteckningar — och det syns sällan direkt, utan som "min
text försvann" veckor senare.

Det har hänt flera gånger (se `WORKLOG.md` i soul-canvas, 2026-08-08).

## Varför inte ett delat paket

Det var påtänkt och bortvalt medvetet 2026-08-10: ett tredje repo blir en till
sak att hålla reda på, och en till sak alla som ska jobba i koden måste känna
till. Priset är att den här filen och testerna nedan är det enda som håller
ihop det. Ta dem på allvar.

## De delade delarna

| Funktion | Omnical | Soul Canvas |
|---|---|---|
| FNV-1a-hash | `stableContentHash` (src/lib/folder-notes.ts) | `stableTextHash` (src/utils/omnicalNotes.ts) |
| Dela upp fil i frontmatter + body | `splitMarkdown` (folder-notes.ts) | `splitMarkdown` (omnicalNotes.ts **och** cardMarkdown.ts) |
| Läsa ett YAML-värde | `parseScalar` (folder-notes.ts) | `parseScalar` (omnicalNotes.ts **och** cardMarkdown.ts) |
| Läsa ett helt frontmatter-block | `frontmatterValues` (folder-notes.ts) | `parseValues` (omnicalNotes.ts **och** cardMarkdown.ts) |
| Ägda nycklar | `RESERVED_FRONTMATTER_KEYS` (folder-notes.ts) | `writeSharedMarkdown` (omnicalNotes.ts) |

`cardMarkdown.ts` gäller Souls **egna** kortfiler i en annan mapp, som Omnical
aldrig läser. Den hör ändå hit: den är en tredje kopia av samma parsning, och
när den glider isär blir nästa persons bild av "hur vi parsar" fel.

### Hashen får aldrig ändras

Båda apparna sparar hashen som synkbaslinje på disk. Ändrar du algoritmen blir
varje sparad baslinje ogiltig: oförändrade anteckningar ser ändrade ut, och
trevägsmergen kan välja fel sida. Det finns ingen migrationsväg — bara skada.

Kontrollvärden (identiska i båda apparna, verifierade 2026-08-10):

```
""                          -> 811c9dc5
"a"                         -> e40c292c
"Brödtext"                  -> 6a35a580
"möte med föräldrar #skola" -> 3aa6bf1b
```

### Nyckelkontraktet

Omnical äger och skriver om: `omnicalId`, `date`, `created`, `updated`,
`trackId`, `område`, `activityId`, `tags`, `done`, `sources`, `remindAt`,
`archived`, `omnicalDraft`.

Soul skriver sex av dem i en delad anteckning: `tags`, `done`, `archived`,
`område`, `remindAt`, `updated`. Alla sex är delade med flit.

Soul skriver också `soulCardId`, som Omnical **inte** äger — den måste överleva
som främmande frontmatter genom Omnicals omskrivningar. Reservera den och
delade kort fastnar på "Väntar på Omnical" (buggen 2026-08-08).

Regler:

1. Varje nyckel Soul skriver i en delad anteckning måste finnas i Omnicals
   reserverade lista.
2. Soul får aldrig skriva `omnicalId`, `date`, `created`, `trackId`,
   `activityId`, `sources` eller `omnicalDraft`.
3. `soulCardId` får aldrig läggas till i Omnicals reserverade lista.
4. Båda apparna bevarar allt annat i frontmatter rad för rad, orört.

## Kända skillnader — inte buggar, men inte heller beslutade

De tre kopiorna gör redan olika saker. Skillnaderna är kartlagda och testade,
men **inte** utjämnade, eftersom att jämna ut dem skriver om befintliga filer
tyst. Var och en är ett eget beslut som återstår:

| | Omnical | Soul (anteckningar) | Soul (kort) |
|---|---|---|---|
| Fil utan `---`-block | hela filen blir body | filen är osynlig | tom frontmatter + body |
| `område: 'Skola'` (enkla citattecken) | behålls som `'Skola'` | blir `Skola` | blir `Skola` |
| Trimning av body | vid anropsplatsen | inne i `splitMarkdown` | inne i `splitMarkdown` |
| Nycklar som läses som listor | `tags` | `tags` | `tags`, `semanticTags` |

Två till, i taggarna (Omnicals `mergeDayNoteTags` i `src/lib/daynote.ts` mot
Souls `normalizeTags`):

- **NFC:** Soul normaliserar, Omnical inte. Ett `ä` skrivet på iPad kan därför
  räknas som två olika taggar beroende på vilken app som läser.
- **`#a#b`:** blir en tagg i Omnical, två i Soul.

Utjämning av dessa kräver ett uttryckligt beslut från Simon, och ska göras en i
taget med ett eget test — aldrig i förbifarten under annat arbete.

## Vad som skyddar det

1. **Kommentarer i koden.** Varje funktion i tabellen ovan har en kommentar som
   pekar hit. Ser du en sådan kommentar: ändringen påverkar den andra appen.
2. **Kontraktstestet**, som finns i båda repona med identiska testdata:
   - Omnical: `src/lib/shared-markdown-contract.test.ts`
   - Soul Canvas: `tests/sharedMarkdownContract.test.ts`
   Ändrar du parsningen i den ena appen failar den appens egna tester direkt.
   Fixturblocket överst i filerna ska vara byte-identiskt mellan repona.
3. **Skillen `markdown-protector`** (`~/.claude/skills/markdown-protector/`) med
   en kodkarta över hela kontraktet. Kallas på vid namn när kontraktet ska
   granskas på djupet.

## När du ändrar något här

- Ändrar du en funktion i tabellen: gör samma ändring i det andra repot, i
  samma arbetspass. Inte "senare".
- Ändrar du fixturblocket i kontraktstestet: kopiera det till det andra repot.
- Lägger du till en ägd frontmatter-nyckel: uppdatera tabellen ovan, båda
  repons kontraktstest, och kodkartan i skillen.
- Är du osäker på om en ändring påverkar den andra appen: den gör det
  förmodligen. Fråga.
