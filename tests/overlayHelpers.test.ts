import { describe, expect, it } from 'vitest';
import { clampMenuPosition } from '../src/components/overlays/contextMenuPosition';
import { parseImportText } from '../src/components/overlays/massImport';

describe('parseImportText', () => {
  it('uses the first line as the title and the last tag line as tags', () => {
    const cards = parseImportText('# Rubrik\nRad ett\nRad tva\n#tagg1 #tagg2');

    expect(cards).toEqual([
      {
        title: 'Rubrik',
        content: 'Rad ett\nRad tva',
        tags: ['tagg1', 'tagg2'],
      },
    ]);
  });

  it('falls back to the title when a card has no body content', () => {
    const cards = parseImportText('Kort utan brodtext');

    expect(cards).toEqual([
      {
        title: 'Kort utan brodtext',
        content: 'Kort utan brodtext',
        tags: [],
      },
    ]);
  });
});

describe('clampMenuPosition', () => {
  it('leaves the menu position unchanged when it already fits', () => {
    expect(
      clampMenuPosition({
        x: 100,
        y: 80,
        width: 200,
        height: 120,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ x: 100, y: 80 });
  });

  it('clamps the menu inside the viewport padding', () => {
    expect(
      clampMenuPosition({
        x: 780,
        y: 590,
        width: 200,
        height: 120,
        viewportWidth: 800,
        viewportHeight: 600,
      }),
    ).toEqual({ x: 590, y: 470 });
  });
});
