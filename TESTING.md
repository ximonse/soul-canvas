# Soul Canvas - Systematisk Testplan

## Översikt
Denna testplan säkerställer att alla funktioner i Soul Canvas fungerar korrekt efter implementeringen av nya shortcuts och features.

---

## 1. GRUNDLÄGGANDE FUNKTIONER

### 1.1 Filhantering
- [ ] **Öppna projekt**: Klicka "Connect to Folder" och välj en mapp
- [ ] **Auto-save**: Verifiera att ändringar sparas automatiskt efter 2 sekunder
- [ ] **Manuell save**: Tryck `Ctrl+Enter` för att spara direkt
- [ ] **Save status**: Kontrollera att save-status visas i menyn (waiting → saving → saved)

### 1.2 Skapa Kort
- [ ] **Nytt textkort (dubbel-klick)**: Dubbelklicka på tom canvas för att skapa textkort
- [ ] **Nytt textkort (N)**: Tryck `N` för att skapa textkort i mitten av skärmen
- [ ] **Importera bild (I)**: Tryck `I` och välj en bild
- [ ] **Dra och släpp bild**: Dra en bild från filutforskaren till canvasen
- [ ] **Klistra in bild**: Kopiera en bild och tryck `Ctrl+V` (i annat program) för att klistra in

### 1.3 Redigera Kort
- [ ] **Öppna editor**: Dubbelklicka på ett kort för att redigera
- [ ] **Spara med Ctrl+Enter**: Redigera ett kort och spara med `Ctrl+Enter`
- [ ] **Stäng med Escape**: Öppna editor och tryck `Escape` för att stänga utan att spara
- [ ] **Redigera taggar**: Lägg till taggar (kommaseparerade) i editorn
- [ ] **Redigera kommentar**: Lägg till kommentar i editorn

---

## 2. MARKERING OCH NAVIGATION

### 2.1 Markera Kort
- [ ] **Enkel markering**: Klicka på ett kort (endast kanten ändrar färg, inte hela kortet)
- [ ] **Multi-markering**: Shift+klicka för att markera flera kort
- [ ] **Markera alla**: Tryck `Ctrl+A` för att markera alla kort
- [ ] **Avmarkera**: Tryck `Escape` för att avmarkera alla kort

### 2.2 Kamera & Zoom
- [ ] **Panera**: Dra på tom canvas för att panera (när inget kort dras)
- [ ] **Zooma**: Använd mushjulet för att zooma in/ut
- [ ] **Centrera kamera**: Tryck `-` för att centrera på markerade kort (eller alla om inga är markerade)
- [ ] **Zoom-gränser**: Verifiera att zoom begränsas mellan 0.1x och 2x

---

## 3. COPY/PASTE & UNDO/REDO

### 3.1 Copy & Paste
- [ ] **Kopiera kort**: Markera kort och tryck `Ctrl+C`
- [ ] **Klistra in kort**: Tryck `Ctrl+V` för att klistra in i mitten av skärmen
- [ ] **Multipla kopior**: Klistra in samma kort flera gånger (ska skapas med "pasted_" tagg)
- [ ] **Bevara position**: Klistrade kort ska behålla relativ position till varandra

### 3.2 Undo & Redo
- [ ] **Undo**: Skapa ett kort, tryck `Ctrl+Z` för att ångra
- [ ] **Redo**: Efter undo, tryck `Ctrl+Y` för att göra om
- [ ] **Multipla undo**: Gör flera ändringar och undo flera gånger
- [ ] **Undo efter delete**: Radera kort och tryck `Ctrl+Z` för att återställa
- [ ] **Undo stack limit**: Verifiera att max 50 undo-steg sparas

---

## 4. ARRANGEMENTS

### 4.1 Enkla Arrangements
- [ ] **Vertikal rad (V)**: Markera flera kort och tryck `V`
- [ ] **Horisontell rad (H)**: Markera flera kort och tryck `H`
- [ ] **Stack/Circle (Q)**: Markera flera kort och tryck `Q`

### 4.2 Grid Arrangements
- [ ] **Grid Vertikal (G+V)**: Markera kort, tryck `G` sedan `V` (inom 500ms)
- [ ] **Grid Horisontell (G+H)**: Markera kort, tryck `G` sedan `H`
- [ ] **Kanban/Overlapping Rows (G+T)**: Markera kort, tryck `G` sedan `T`
- [ ] **Animation**: Verifiera att kort animeras smootht till nya positioner (0.3s)

---

## 5. SÖKNING & FILTERING

### 5.1 Sök
- [ ] **Öppna sök (/)**: Tryck `/` för att öppna sökfältet
- [ ] **Fokusera sök (F)**: Tryck `F` för att fokusera sökfältet (eller öppna om stängd)
- [ ] **Söka text**: Sök efter text i kort (filtrerar synliga kort)
- [ ] **Stäng sök med Escape**: Tryck `Escape` för att stänga och rensa sök
- [ ] **Enter markerar träffar**: Tryck `Enter` för att markera alla sökträffar

### 5.2 Boolean Search
- [ ] **AND**: Sök "word1 AND word2"
- [ ] **OR**: Sök "word1 OR word2"
- [ ] **NOT**: Sök "word1 NOT word2"
- [ ] **Kombinationer**: Testa "word1 AND (word2 OR word3)"

---

## 6. COMMAND PALETTE

### 6.1 Öppna & Navigera
- [ ] **Öppna (Space)**: Tryck `Space` för att öppna command palette
- [ ] **Navigera**: Använd pil upp/ner för att navigera kommandon
- [ ] **Exekvera**: Tryck `Enter` för att köra valt kommando
- [ ] **Stäng**: Tryck `Escape` för att stänga

### 6.2 Kommandon
- [ ] **AI Panel (B)**: Öppna AI Panel via command palette
- [ ] **Settings (S)**: Öppna inställningar via command palette
- [ ] **Generate Embeddings**: Kör AI-kommando för embeddings
- [ ] **Auto-Link Similar**: Kör AI-kommando för auto-linking
- [ ] **Filter kommandon**: Skriv för att filtrera kommandon

---

## 7. AI-FUNKTIONER

### 7.1 OCR & Bildanalys
- [ ] **OCR på bild**: Högerklicka på bildkort och välj "Run OCR"
- [ ] **Gemini API-nyckel**: Sätt API-nyckel i Settings
- [ ] **OCR-resultat**: Verifiera att OCR-text visas på kortets baksida
- [ ] **Bildanalys**: Verifiera att bildanalys läggs till OCR-resultat

### 7.2 Embeddings & Linking
- [ ] **Generate Embeddings**: Command palette → Generate Embeddings
- [ ] **Auto-Link**: Command palette → Auto-Link Similar (länkar kort med likande innehåll)
- [ ] **Threshold**: Testa olika auto-link thresholds i Settings
- [ ] **Visualisera länkar**: Se att synapser (linjer) syns mellan länkade kort

### 7.3 AI Reflection & Tags
- [ ] **AI Reflection**: Command palette → AI Reflection (Claude analyserar alla kort)
- [ ] **Generate Tags**: Markera kort → Command palette → Generate Tags
- [ ] **Semantiska taggar**: Verifiera att AI genererar relevanta taggar

---

## 8. PINNING & LOCKING

### 8.1 Pinning
- [ ] **Pin kort (P)**: Markera kort och tryck `P` för att pinna
- [ ] **Unpin**: Tryck `P` igen för att unpinna
- [ ] **Pinned indicator**: Verifiera att pinned kort visar en cirkel-indikator
- [ ] **Pinned kan inte dras**: Verifiera att pinned kort inte kan dras i group-drag

---

## 9. TEMAN & UI

### 9.1 Teman
- [ ] **Jord-tema som standard**: Verifiera att "Jord"-temat laddas som standard
- [ ] **Växla tema (T)**: Tryck `T` för att växla mellan teman
- [ ] **Zen Mode (Z)**: Tryck `Z` för att dölja UI (tryck igen eller `Escape` för att visa)
- [ ] **Dark/Light teman**: Testa alla tillgängliga teman

### 9.2 UI-element
- [ ] **Toolbar**: Verifiera att toolbar syns i icke-Zen mode
- [ ] **Selected counter**: När kort är markerade, visas antal + actions längst ner
- [ ] **Bulk tag**: Markera flera kort, skriv en tagg och klicka "Tagga"
- [ ] **Bulk delete**: Markera flera kort och klicka "Radera"

---

## 10. PERFORMANCE & VIEWPORT CULLING

### 10.1 Performance
- [ ] **Skapa 100+ kort**: Verifiera att performance är bra med många kort
- [ ] **Viewport culling**: Verifiera att endast synliga kort renderas (vid >50 kort)
- [ ] **Smooth zoom**: Verifiera att zoom är smooth även med många kort
- [ ] **Smooth pan**: Verifiera att pan är smooth även med många kort

---

## 11. EDGE CASES & BUG TESTING

### 11.1 Edge Cases
- [ ] **Tom canvas**: Testa alla funktioner på tom canvas
- [ ] **Ett kort**: Testa arrangements med endast ett kort
- [ ] **Ingen markering**: Testa copy/paste utan markerade kort (ska inte göra något)
- [ ] **Full undo stack**: Gör 60+ ändringar och verifiera att äldsta raderas

### 11.2 Drag & Drop
- [ ] **Dra utan hopp**: Dra ett kort och verifiera att det INTE hoppar när det släpps
- [ ] **Group drag**: Markera flera kort, dra ett – alla ska röra sig
- [ ] **Stage drag disabled vid node drag**: Verifiera att canvasen inte panoreras när ett kort dras

### 11.3 Keyboard Conflicts
- [ ] **Z utan Ctrl**: Tryck `Z` (ska öppna Zen Mode, inte undo)
- [ ] **V utan Ctrl**: Tryck `V` (ska arrangera vertikalt, inte paste)
- [ ] **Typing i editor**: Verifiera att shortcuts INTE triggas när man skriver i editor
- [ ] **Search input**: Verifiera att shortcuts INTE triggas i sökfältet

---

## 12. FULLSTÄNDIG WORKFLOW-TEST

### 12.1 Komplett Session
1. [ ] Öppna projekt-mapp
2. [ ] Skapa 5 textkort med `N`
3. [ ] Importera 3 bilder med `I`
4. [ ] Redigera innehåll i varje kort (dubbelklicka)
5. [ ] Markera alla kort (`Ctrl+A`)
6. [ ] Arrangera i grid horisontell (`G+H`)
7. [ ] Kopiera alla kort (`Ctrl+C`)
8. [ ] Klistra in (`Ctrl+V`)
9. [ ] Undo (`Ctrl+Z`)
10. [ ] Redo (`Ctrl+Y`)
11. [ ] Sök efter specifikt ord (`/`)
12. [ ] Markera sökträffar (`Enter`)
13. [ ] Bulk-tagga markerade kort
14. [ ] Centrera kamera (`-`)
15. [ ] Testa undo flera steg bakåt
16. [ ] Verifiera att auto-save fungerar
17. [ ] Stäng och öppna projekt igen – verifiera att allt finns kvar

---

## SAMMANFATTNING

**Total antal tester**: ~100 test cases
**Estimerad tid**: 2-3 timmar för fullständig genomgång
**Prioriterade områden**:
1. Copy/Paste & Undo/Redo (nyimplementerat)
2. Drag & drop utan hopp
3. Keyboard shortcuts utan konflikter
4. Performance med många kort

**Rapportera buggar**: Skapa issues i GitHub eller dokumentera i `BUGS.md`
