'use strict';

/**
 * Testes unitários para as funções puras de app.js.
 *
 * O app.js executa chamadas a document.getElementById no nível do módulo,
 * portanto precisamos de um stub de document ANTES do require.
 */

// --- mock de DOM (deve vir antes do require de app.js) ---
const mockElem = { addEventListener: () => {} };
global.document = {
  getElementById: () => mockElem,
};

const {
  noteToHSL,
  hslIsBright,
  flatToSharp,
  abcPitchToNote,
  limitBarsPerLine,
} = require(require('path').join(__dirname, '../../src/app.js'));

// ---------------------------------------------------------------------------
// noteToHSL
// ---------------------------------------------------------------------------
describe('noteToHSL', () => {
  describe('cada nota retorna string que começa com hsl(', () => {
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    notes.forEach((note) => {
      test(`nota ${note} retorna string começando com 'hsl('`, () => {
        expect(noteToHSL(note, 4)).toMatch(/^hsl\(/);
      });
    });
  });

  test('oitava 4 retorna lightness 50%', () => {
    expect(noteToHSL('C', 4)).toBe('hsl(0, 85%, 50%)');
  });

  test('oitava 5 retorna lightness 70%', () => {
    expect(noteToHSL('C', 5)).toBe('hsl(0, 85%, 70%)');
  });

  test('oitava 3 retorna lightness 30%', () => {
    expect(noteToHSL('C', 3)).toBe('hsl(0, 85%, 30%)');
  });

  test('oitava 1 retorna lightness mínima (15%) — não vai abaixo', () => {
    // diff = 1 - 4 = -3 → 50 + (-3)*20 = -10 → clamp a 15
    expect(noteToHSL('C', 1)).toBe('hsl(0, 85%, 15%)');
  });

  test('oitava 0 também é limitada à lightness mínima (15%)', () => {
    expect(noteToHSL('C', 0)).toBe('hsl(0, 85%, 15%)');
  });

  test('oitava 7 retorna lightness máxima (85%) — não vai acima', () => {
    // diff = 7 - 4 = 3 → 50 + 3*20 = 110 → clamp a 85
    expect(noteToHSL('C', 7)).toBe('hsl(0, 85%, 85%)');
  });

  test('oitava 8 também é limitada à lightness máxima (85%)', () => {
    expect(noteToHSL('C', 8)).toBe('hsl(0, 85%, 85%)');
  });

  test('nota inválida retorna null', () => {
    expect(noteToHSL('X', 4)).toBeNull();
    expect(noteToHSL('H', 4)).toBeNull();
    expect(noteToHSL('', 4)).toBeNull();
  });

  test('aceita letra minúscula (usa charAt(0).toUpperCase)', () => {
    expect(noteToHSL('c', 4)).toBe('hsl(0, 85%, 50%)');
    expect(noteToHSL('g', 4)).toBe('hsl(190, 85%, 50%)');
  });

  test('cada nota tem matiz HSL correto na oitava 4', () => {
    expect(noteToHSL('C', 4)).toBe('hsl(0, 85%, 50%)');
    expect(noteToHSL('D', 4)).toBe('hsl(30, 85%, 50%)');
    expect(noteToHSL('E', 4)).toBe('hsl(60, 85%, 50%)');
    expect(noteToHSL('F', 4)).toBe('hsl(120, 85%, 50%)');
    expect(noteToHSL('G', 4)).toBe('hsl(190, 85%, 50%)');
    expect(noteToHSL('A', 4)).toBe('hsl(240, 85%, 50%)');
    expect(noteToHSL('B', 4)).toBe('hsl(280, 85%, 50%)');
  });
});

// ---------------------------------------------------------------------------
// hslIsBright
// ---------------------------------------------------------------------------
describe('hslIsBright', () => {
  test('lightness 60% retorna true', () => {
    expect(hslIsBright('hsl(0, 85%, 60%)')).toBe(true);
  });

  test('lightness 30% retorna false', () => {
    expect(hslIsBright('hsl(0, 85%, 30%)')).toBe(false);
  });

  test('lightness 55% retorna true (limite exato)', () => {
    expect(hslIsBright('hsl(0, 85%, 55%)')).toBe(true);
  });

  test('lightness 54% retorna false (abaixo do limite)', () => {
    expect(hslIsBright('hsl(0, 85%, 54%)')).toBe(false);
  });

  test('string inválida retorna false', () => {
    expect(hslIsBright('not a color')).toBe(false);
    expect(hslIsBright('')).toBe(false);
    expect(hslIsBright('rgb(255, 0, 0)')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// flatToSharp
// ---------------------------------------------------------------------------
describe('flatToSharp', () => {
  test('Db → C#', () => {
    expect(flatToSharp('Db')).toBe('C#');
  });

  test('Eb → D#', () => {
    expect(flatToSharp('Eb')).toBe('D#');
  });

  test('Gb → F#', () => {
    expect(flatToSharp('Gb')).toBe('F#');
  });

  test('Ab → G#', () => {
    expect(flatToSharp('Ab')).toBe('G#');
  });

  test('Bb → A#', () => {
    expect(flatToSharp('Bb')).toBe('A#');
  });

  test('Cb → B (enarmonia sem sustenido)', () => {
    expect(flatToSharp('Cb')).toBe('B');
  });

  test('Fb → E (enarmonia sem sustenido)', () => {
    expect(flatToSharp('Fb')).toBe('E');
  });

  test('C (sem bemol) → C (sem modificação)', () => {
    expect(flatToSharp('C')).toBe('C');
  });

  test('Xb (não mapeado) → Xb (sem modificação)', () => {
    expect(flatToSharp('Xb')).toBe('Xb');
  });
});

// ---------------------------------------------------------------------------
// abcPitchToNote
// ---------------------------------------------------------------------------

/** Constrói um absElem no formato esperado pelo abcjs engraver. */
function makeElem(pitchValue, accidental) {
  const p = { pitch: pitchValue };
  if (accidental !== undefined) p.accidental = accidental;
  return { abcelem: { pitches: [p] } };
}

describe('abcPitchToNote', () => {
  test('elemento com pitches vazio retorna null', () => {
    expect(abcPitchToNote({ abcelem: { pitches: [] } })).toBeNull();
  });

  test('elemento sem abcelem retorna null', () => {
    expect(abcPitchToNote({})).toBeNull();
  });

  test('elemento sem pitches retorna null', () => {
    expect(abcPitchToNote({ abcelem: {} })).toBeNull();
  });

  test('pitch=0 → { name: "C", octave: 4 }', () => {
    const result = abcPitchToNote(makeElem(0));
    expect(result.name).toBe('C');
    expect(result.octave).toBe(4);
  });

  test('pitch=1 → { name: "D", octave: 4 }', () => {
    const result = abcPitchToNote(makeElem(1));
    expect(result.name).toBe('D');
    expect(result.octave).toBe(4);
  });

  test('pitch=6 → { name: "B", octave: 4 }', () => {
    const result = abcPitchToNote(makeElem(6));
    expect(result.name).toBe('B');
    expect(result.octave).toBe(4);
  });

  test('pitch=7 → { name: "C", octave: 5 } (oitava seguinte)', () => {
    const result = abcPitchToNote(makeElem(7));
    expect(result.name).toBe('C');
    expect(result.octave).toBe(5);
  });

  test('pitch=-7 → { name: "C", octave: 3 } (oitava anterior)', () => {
    // -7 % 7 === 0 em JS → idx=0 (C); Math.floor(-7/7)=-1 → octave=3
    const result = abcPitchToNote(makeElem(-7));
    expect(result.name).toBe('C');
    expect(result.octave).toBe(3);
  });

  test('pitch=0 com accidental="flat" → name "B" (Cb = B via flatToSharp)', () => {
    // noteNames[0]='C'; flatToSharp('Cb') = 'B'
    const result = abcPitchToNote(makeElem(0, 'flat'));
    expect(result.name).toBe('B');
    expect(result.octave).toBe(4);
  });

  test('pitch=1 com accidental="sharp" → name "D#"', () => {
    const result = abcPitchToNote(makeElem(1, 'sharp'));
    expect(result.name).toBe('D#');
    expect(result.octave).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// limitBarsPerLine
// ---------------------------------------------------------------------------
describe('limitBarsPerLine', () => {
  test('cabeçalho ABC (X:, T:, M:, L:, K:) é preservado sem quebras', () => {
    const abc = 'X:1\nT:Title\nM:4/4\nL:1/8\nK:C\nCDEF|GABC|';
    const result = limitBarsPerLine(abc, 4);
    const lines = result.split('\n');
    expect(lines[0]).toBe('X:1');
    expect(lines[1]).toBe('T:Title');
    expect(lines[2]).toBe('M:4/4');
    expect(lines[3]).toBe('L:1/8');
    expect(lines[4]).toBe('K:C');
  });

  test('linha com 4 compassos e maxbars=2 → dividida em 2 linhas de 2 compassos', () => {
    const abc = 'X:1\nK:C\nCDEF|GABC|CDEF|GABC|';
    const result = limitBarsPerLine(abc, 2);
    const lines = result.split('\n');
    // linhas 0 e 1 são X:1 e K:C
    expect(lines[2]).toBe('CDEF|GABC|');
    expect(lines[3]).toBe('CDEF|GABC|');
    expect(lines).toHaveLength(4);
  });

  test('linha com 2 compassos e maxbars=2 → mantém 1 linha de música', () => {
    const abc = 'K:C\nCDEF|GABC|';
    const result = limitBarsPerLine(abc, 2);
    const lines = result.split('\n');
    // linha 0 = K:C, linha 1 = música
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('CDEF|GABC|');
  });

  test('linha vazia de música é removida (sem caracteres, sem barras)', () => {
    // A implementação atual não re-emite linhas vazias na seção de música.
    const abc = 'K:C\n\nCDEF|GABC|';
    const result = limitBarsPerLine(abc, 4);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('K:C');
    expect(lines[1]).toBe('CDEF|GABC|');
  });

  test('campo w: (letra) após K: não é quebrado', () => {
    // w: corresponde a /^\w\s*:/ e portanto é tratado como campo, não música
    const abc = 'K:C\nCDEF|GABC|CDEF|GABC|\nw:do re mi fa sol la si do';
    const result = limitBarsPerLine(abc, 2);
    const lines = result.split('\n');
    // w: deve aparecer intacta como a última linha
    expect(lines[lines.length - 1]).toBe('w:do re mi fa sol la si do');
  });

  test('resultado é string', () => {
    expect(typeof limitBarsPerLine('K:C\nCDEF|', 2)).toBe('string');
  });
});
