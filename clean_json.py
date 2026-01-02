"""
Rensar Soul Canvas JSON-filer:
- Tar bort embedding-fält
- Tar bort tomma kort
- Tar bort dubbletter (liknande content ELLER nara x,y position)
- Nollar updatedAt
- Behaaller forsta forekomsten

Användning: python clean_json.py <input.json> [output.json]
"""

import json
import sys
import re
from pathlib import Path


def normalize(text):
    """Normalisera text for jamforelse - ta bort extra whitespace, lowercase"""
    text = re.sub(r'\s+', ' ', text.strip().lower())
    return text[:100]  # Jamfor bara forsta 100 tecken


def extract_title(content):
    """Om content borjar med markdown-rubrik, extrahera som title"""
    match = re.match(r'^(#{1,3})\s+(.+?)(?:\n|$)', content.strip())
    if match:
        title = match.group(2).strip()
        rest = content[match.end():].strip()
        return title, rest
    return None, content


def clean_soul_canvas(input_path: str, output_path: str = None):
    if output_path is None:
        p = Path(input_path)
        output_path = str(p.parent / f"{p.stem}_clean{p.suffix}")

    print(f"Laser {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    original_count = len(data.get('nodes', []))
    original_size = Path(input_path).stat().st_size

    seen_content = set()
    seen_positions = set()
    unique_nodes = []
    removed = {'content': 0, 'position': 0, 'empty': 0}
    titles_extracted = 0

    for node in data.get('nodes', []):
        # Ta bort embedding
        node.pop('embedding', None)

        # Nolla updatedAt
        if 'updatedAt' in node:
            node['updatedAt'] = None

        content = node.get('content', '').strip()

        # Extrahera markdown-rubrik till title
        title, new_content = extract_title(content)
        if title and not node.get('title'):
            node['title'] = title
            node['content'] = new_content
            content = new_content
            titles_extracted += 1

        # Skippa tomma kort (men behall om de har title)
        if not content and not node.get('title'):
            removed['empty'] += 1
            continue

        # Anvand title + content for dubblettcheck
        check_text = (node.get('title', '') + ' ' + content).strip()
        normalized = normalize(check_text) if check_text else ''

        # Avrunda position till narmaste 10px
        pos = (round(node.get('x', 0), -1), round(node.get('y', 0), -1))

        # Skippa om liknande content (forsta 100 tecken)
        if normalized and normalized in seen_content:
            removed['content'] += 1
            continue

        # Skippa om nara position (inom 10px)
        if pos in seen_positions:
            removed['position'] += 1
            continue

        seen_content.add(normalized)
        seen_positions.add(pos)
        unique_nodes.append(node)

    data['nodes'] = unique_nodes

    print(f"Skriver {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    new_size = Path(output_path).stat().st_size

    print(f"\n=== Resultat ===")
    print(f"Kort: {original_count} -> {len(unique_nodes)}")
    print(f"  - {removed['empty']} tomma")
    print(f"  - {removed['content']} dubbletter (liknande content)")
    print(f"  - {removed['position']} dubbletter (nara position)")
    print(f"  - {titles_extracted} rubriker extraherade")
    print(f"Storlek: {original_size/1024/1024:.1f} MB -> {new_size/1024/1024:.1f} MB")
    print(f"Sparat till: {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Användning: python clean_json.py <input.json> [output.json]")
        sys.exit(1)

    clean_soul_canvas(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None)
