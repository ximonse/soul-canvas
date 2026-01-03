# Zotero Drag-and-Drop Payloads

Captured payloads (DataTransfer) from Zotero drag-and-drop. Stored as a reference
for future parsing/automation.

## Zotero HTML export reference
See `docs/zoterohtml-export-reference.html` for a raw Zotero HTML export example
used as a parsing baseline.

## Combined (item + PDF + link)
```json
{
  "types": [
    "text/plain",
    "text/uri-list",
    "text/html",
    "Files"
  ],
  "files": [
    {
      "name": "Batinovic2025.pdf",
      "type": "application/pdf",
      "size": 1886245
    }
  ],
  "items": [
    {
      "kind": "string",
      "type": "text/plain"
    },
    {
      "kind": "string",
      "type": "text/uri-list"
    },
    {
      "kind": "string",
      "type": "text/html"
    },
    {
      "kind": "file",
      "type": "application/pdf"
    }
  ],
  "payloads": {
    "text/plain": "Batinovic, L. (2025). School-based interventions for primary and secondary school students with intellectual disability: A scoping review (No. heujm_v2). PsyArXiv. https://doi.org/10.31234/osf.io/heujm_v2\nBatinovic2025. (u.å.).\n",
    "text/uri-list": "file:///C:/Users/ximon/Zotero/storage/XSBU8T64/Batinovic2025.pdf",
    "text/html": "<div class=\"csl-bib-body\" style=\"line-height: 2; margin-left: 2em; text-indent:-2em;\">\n  <div class=\"csl-entry\">Batinovic, L. (2025). <i>School-based interventions for primary and secondary school students with intellectual disability: A scoping review</i> (No. heujm_v2). PsyArXiv. <a href=\"https://doi.org/10.31234/osf.io/heujm_v2\">https://doi.org/10.31234/osf.io/heujm_v2</a></div>\n  <span class=\"Z3988\" title=\"url_ver=Z39.88-2004&amp;ctx_ver=Z39.88-2004&amp;rfr_id=info%3Asid%2Fzotero.org%3A2&amp;rft_id=info%3Adoi%2F10.31234%2Fosf.io%2Fheujm_v2&amp;rft_val_fmt=info%3Aofi%2Ffmt%3Amtx%3Adc&amp;rft.type=preprint&amp;rft.title=School-based%20interventions%20for%20primary%20and%20secondary%20school%20students%20with%20intellectual%20disability%3A%20A%20scoping%20review&amp;rft.description=This%20scoping%20review%20mapped%20school-based%20interventions%20for%20K-12%20students%20with%20intellectual%20developmental%20disorder%20(IDD%3B%20IQ%20%E2%89%A475%20or%20a%20diagnosed%20intellectual%20disability)%2C%20focusing%20on%20outcomes%2C%20theoretical%20frameworks%2C%20study%20designs%2C%20and%20research%20transparency.%20A%20systematic%20search%20across%20six%20databases%20identified%20952%20studies%2C%20published%202000-2023.%20The%20most%20common%20interventions%20were%20assistive%20or%20instructional%2C%20primarily%20targeting%20academic%20outcomes.%20Multiple%20probe%20designs%20were%20the%20most%20prevalent%20study%20method%2C%20with%20frequent%20reliance%20on%20non-standardized%20measures.%20Reporting%20on%20theoretical%20frameworks%20was%20limited%2C%20and%20adherence%20to%20open%20science%20practices%20including%20data%20sharing%20and%20ethics%20statement%20reporting%2C%20was%20minimal.%20The%20findings%20highlight%20the%20need%20for%20improved%20methods%20to%20synthesize%20prevalent%20single-case%20evidence%20in%20this%20field.%20Furthermore%20the%20limited%20engagement%20with%20open%20science%20practices%20warrants%20exploration%20of%20barriers%20to%20and%20support%20for%20their%20implementation.&amp;rft.identifier=urn%3Adoi%3A10.31234%2Fosf.io%2Fheujm_v2&amp;rft.aufirst=Lucija&amp;rft.aulast=Batinovic&amp;rft.au=Lucija%20Batinovic&amp;rft.date=2025-06-23\"></span>\n  <div class=\"csl-entry\"><i>Batinovic2025</i>. (u.å.).</div>\n  <span class=\"Z3988\" title=\"url_ver=Z39.88-2004&amp;ctx_ver=Z39.88-2004&amp;rfr_id=info%3Asid%2Fzotero.org%3A2&amp;rft_val_fmt=info%3Aofi%2Ffmt%3Amtx%3Adc&amp;rft.type=attachment&amp;rft.title=Batinovic2025\"></span>\n</div>"
  }
}
```

## Main item only
```json
{
  "types": [
    "text/plain",
    "text/html"
  ],
  "files": [],
  "items": [
    {
      "kind": "string",
      "type": "text/plain"
    },
    {
      "kind": "string",
      "type": "text/html"
    }
  ],
  "payloads": {
    "text/plain": "Batinovic, L. (2025). School-based interventions for primary and secondary school students with intellectual disability: A scoping review (No. heujm_v2). PsyArXiv. https://doi.org/10.31234/osf.io/heujm_v2\n",
    "text/html": "<div class=\"csl-bib-body\" style=\"line-height: 2; margin-left: 2em; text-indent:-2em;\">\n  <div class=\"csl-entry\">Batinovic, L. (2025). <i>School-based interventions for primary and secondary school students with intellectual disability: A scoping review</i> (No. heujm_v2). PsyArXiv. <a href=\"https://doi.org/10.31234/osf.io/heujm_v2\">https://doi.org/10.31234/osf.io/heujm_v2</a></div>\n  <span class=\"Z3988\" title=\"url_ver=Z39.88-2004&amp;ctx_ver=Z39.88-2004&amp;rfr_id=info%3Asid%2Fzotero.org%3A2&amp;rft_id=info%3Adoi%2F10.31234%2Fosf.io%2Fheujm_v2&amp;rft_val_fmt=info%3Aofi%2Ffmt%3Amtx%3Adc&amp;rft.type=preprint&amp;rft.title=School-based%20interventions%20for%20primary%20and%20secondary%20school%20students%20with%20intellectual%20disability%3A%20A%20scoping%20review&amp;rft.description=This%20scoping%20review%20mapped%20school-based%20interventions%20for%20K-12%20students%20with%20intellectual%20developmental%20disorder%20(IDD%3B%20IQ%20%E2%89%A475%20or%20a%20diagnosed%20intellectual%20disability)%2C%20focusing%20on%20outcomes%2C%20theoretical%20frameworks%20study%20designs%20and%20research%20transparency.%20A%20systematic%20search%20across%20six%20databases%20identified%20952%20studies%20published%202000-2023.%20The%20most%20common%20interventions%20were%20assistive%20or%20instructional%20primarily%20targeting%20academic%20outcomes.%20Multiple%20probe%20designs%20were%20the%20most%20prevalent%20study%20method%20with%20frequent%20reliance%20on%20non-standardized%20measures.%20Reporting%20on%20theoretical%20frameworks%20was%20limited%20and%20adherence%20to%20open%20science%20practices%20including%20data%20sharing%20and%20ethics%20statement%20reporting%20was%20minimal.%20The%20findings%20highlight%20the%20need%20for%20improved%20methods%20to%20synthesize%20prevalent%20single-case%20evidence%20in%20this%20field.%20Furthermore%20the%20limited%20engagement%20with%20open%20science%20practices%20warrants%20exploration%20of%20barriers%20to%20and%20support%20for%20their%20implementation.&amp;rft.identifier=urn%3Adoi%3A10.31234%2Fosf.io%2Fheujm_v2&amp;rft.aufirst=Lucija&amp;rft.aulast=Batinovic&amp;rft.au=Lucija%20Batinovic&amp;rft.date=2025-06-23\"></span>\n</div>"
  }
}
```

## Notes (two notes in one payload)
```json
{
  "types": [
    "text/plain",
    "text/html"
  ],
  "files": [],
  "items": [
    {
      "kind": "string",
      "type": "text/plain"
    },
    {
      "kind": "string",
      "type": "text/html"
    }
  ],
  "payloads": {
    "text/plain": "# Anteckningar  \n(2026-01-03 18:36:57)\n\n“This scoping review mapped school-based interventions for K-12 students with intellectual disability (ID; IQ ≤75 or a diagnosed intellectual disability), focusing on outcomes, theoretical frameworks, study designs, and research transparency.” ([Batinovic, 2025, p. 1](zotero://select/library/items/ILKZKSCE)) ([pdf](zotero://open-pdf/library/items/XSBU8T64?page=1&annotation=NDFXXKU6))\n\n“Objective 4: Which theoretical frameworks are the basis of the interventions? We extracted information about any mentioned theoretical frameworks that could have been the basis or a rationale for the conducted intervention. Majority (96%) of the studies had an unclear theoretical framework, and mostly focused on results from previous research, aiming to replicate or build on those findings.” ([Batinovic, 2025, p. 19](zotero://select/library/items/ILKZKSCE)) ([pdf](zotero://open-pdf/library/items/XSBU8T64?page=19&annotation=YKFTS45H))",
    "text/html": "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body><div class=\"zotero-notes\"><div class=\"zotero-note\"><h1>Anteckningar<br>(2026-01-03 18:36:57)</h1>\n<p><span class=\"highlight\"><span style=\"background-color: #5fb23680\">“This scoping review mapped school-based interventions for K-12 students with intellectual disability (ID; IQ ≤75 or a diagnosed intellectual disability), focusing on outcomes, theoretical frameworks, study designs, and research transparency.”</span></span> <span class=\"citation\">(<span class=\"citation-item\">Batinovic, 2025, p. 1</span>)</span></p>\n<p><span class=\"highlight\"><span style=\"background-color: #ffd40080\">“Objective 4: Which theoretical frameworks are the basis of the interventions? We extracted information about any mentioned theoretical frameworks that could have been the basis or a rationale for the conducted intervention. Majority (96%) of the studies had an unclear theoretical framework, and mostly focused on results from previous research, aiming to replicate or build on those findings.”</span></span> <span class=\"citation\">(<span class=\"citation-item\">Batinovic, 2025, p. 19</span>)</span></p>\n</div></div></body></html>"
  }
}
```

## PDF only
```json
{
  "types": [
    "text/plain",
    "text/uri-list",
    "text/html",
    "Files"
  ],
  "files": [
    {
      "name": "Batinovic2025.pdf",
      "type": "application/pdf",
      "size": 1886245
    }
  ],
  "items": [
    {
      "kind": "string",
      "type": "text/plain"
    },
    {
      "kind": "string",
      "type": "text/uri-list"
    },
    {
      "kind": "string",
      "type": "text/html"
    },
    {
      "kind": "file",
      "type": "application/pdf"
    }
  ],
  "payloads": {
    "text/plain": "Batinovic2025. (u.å.).\n",
    "text/uri-list": "file:///C:/Users/ximon/Zotero/storage/XSBU8T64/Batinovic2025.pdf",
    "text/html": "<div class=\"csl-bib-body\" style=\"line-height: 2; margin-left: 2em; text-indent:-2em;\">\n  <div class=\"csl-entry\"><i>Batinovic2025</i>. (u.å.).</div>\n  <span class=\"Z3988\" title=\"url_ver=Z39.88-2004&amp;ctx_ver=Z39.88-2004&amp;rfr_id=info%3Asid%2Fzotero.org%3A2&amp;rft_val_fmt=info%3Aofi%2Ffmt%3Amtx%3Adc&amp;rft.type=attachment&amp;rft.title=Batinovic2025\"></span>\n</div>"
  }
}
```
