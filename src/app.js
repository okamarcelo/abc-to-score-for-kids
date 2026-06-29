/* Mapa de notas musicais (letra) para matiz HSL */
const NOTE_COLORS = {
  C: 0,
  D: 30,
  E: 60,
  F: 120,
  G: 190,
  A: 240,
  B: 280,
};

/* Nomes longos em português para cada nota */
const NOTE_NAMES_PT = {
  C: 'Dó',
  D: 'Ré',
  E: 'Mi',
  F: 'Fá',
  G: 'Sol',
  A: 'Lá',
  B: 'Si',
};

/* Conversão de bemóis para sustenidos (enarmonia) */
const FLAT_TO_SHARP = {
  Cb: 'B',
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
};

/**
 * Retorna uma string HSL para a nota e oitava fornecidas.
 * Claridade varia por oitava: oitava 4 = 50%, ±20% por oitava.
 */
function noteToHSL(noteName, octave) {
  const base = noteName.charAt(0).toUpperCase();
  const hue = NOTE_COLORS[base];
  if (hue === undefined) return null;
  const diff = octave - 4;
  let lightness = 50 + diff * 20;
  lightness = Math.max(15, Math.min(85, lightness));
  return `hsl(${hue}, 85%, ${lightness}%)`;
}

/**
 * Retorna true se a cor HSL é clara o suficiente para exigir texto escuro.
 */
function hslIsBright(hslStr) {
  const m = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!m) return false;
  const l = +m[3];
  return l >= 55;
}

/**
 * Converte um nome de nota com bemol para seu equivalente com sustenido.
 */
function flatToSharp(note) {
  return FLAT_TO_SHARP[note] || note;
}

/**
 * Extrai nome e oitava de um elemento abcjs.
 * @param {object} absElem - elemento do engraver do abcjs
 * @returns {{ name: string, octave: number, accidental: string } | null}
 */
function abcPitchToNote(absElem) {
  /* Fixed: parameter was named 'hslStr' but should be the abcjs element */
  const pitches = absElem.abcelem?.pitches;
  if (!pitches || pitches.length === 0) return null;
  const p = pitches[0];
  const pitch = p.pitch;
  const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const idx = ((pitch % 7) + 7) % 7;
  const octave = Math.floor(pitch / 7) + 4;
  let name = noteNames[idx];

  if (p.accidental === 'flat') {
    /* Fixed: simplified flat→sharp conversion without chained .replace */
    const converted = flatToSharp(name + 'b');
    name = converted;
  } else if (p.accidental === 'sharp') {
    name = name + '#';
  }

  return { name, octave, accidental: p.accidental || '' };
}

/**
 * Quebra as linhas de música para no máximo `maxbars` compassos por linha.
 */
function limitBarsPerLine(abc, maxbars) {
  const lines = abc.split('\n');
  const out = [];
  let inMusic = false;
  for (const line of lines) {
    if (!inMusic) {
      out.push(line);
      if (/^K:/i.test(line.trim())) inMusic = true;
      continue;
    }
    /* Lines that look like field headers stay untouched */
    if (/^\w\s*:/.test(line.trim())) {
      out.push(line);
      continue;
    }
    let barCount = 0;
    let current = '';
    for (const ch of line) {
      current += ch;
      if (ch === '|') {
        barCount++;
        if (barCount % maxbars === 0) {
          out.push(current.trim());
          current = '';
        }
      }
    }
    if (current.trim()) out.push(current.trim());
  }
  return out.join('\n');
}

/**
 * Percorre o SVG gerado pelo abcjs e aplica cores + rótulos às cabeças de nota.
 */
function postProcessSVG(svgEl, tuneObj) {
  if (!tuneObj || !tuneObj[0]) return;
  const tune = tuneObj[0];
  const engraver = tune.engraver;
  if (!engraver || !engraver.staffgroups) return;

  /* Coleta todos os elementos do engraver que representam notas */
  const noteElems = [];
  for (const sg of engraver.staffgroups) {
    if (!sg.voices) continue;
    for (const voice of sg.voices) {
      if (!voice.children) continue;
      for (const elem of voice.children) {
        if (elem.abcelem?.pitches?.length > 0) {
          noteElems.push(elem);
        }
      }
    }
  }

  const noteheads = svgEl.querySelectorAll('path.abcjs-notehead');
  const NS = 'http://www.w3.org/2000/svg';

  noteheads.forEach((headPath, i) => {
    if (i >= noteElems.length) return;

    /* Fixed: was abcPitchToNote(noteElems[i]) with wrong param name inside fn */
    const info = abcPitchToNote(noteElems[i]);
    if (!info) return;

    const color = noteToHSL(info.name.charAt(0), info.octave);
    if (!color) return;

    const dur = noteElems[i].abcelem.duration;
    /* Half notes (0.5) and whole notes (1.0) are hollow in standard notation */
    const isHollow = dur >= 0.5;

    /* Fixed: isHollow is a boolean, not a function — was called as isHollow(color) */
    headPath.setAttribute('fill', isHollow ? '#fff' : color);
    headPath.setAttribute('stroke', isHollow ? color : '#333');
    headPath.setAttribute('stroke-width', isHollow ? '2' : '0.5');

    /* Add note letter label inside the notehead */
    const bbox = headPath.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const fontSize = Math.min(bbox.width * 0.7, bbox.height * 1.1);

    const textColor = isHollow ? color : (hslIsBright(color) ? '#333' : '#fff');

    const text = document.createElementNS(NS, 'text');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', fontSize + 'px');
    text.setAttribute('fill', textColor);
    text.setAttribute('font-family', "'Nunito', 'Segoe UI', sans-serif");
    text.setAttribute('font-weight', '800');
    text.setAttribute('pointer-events', 'none');

    if (isHollow) {
      /* White halo behind the text so it reads over the white notehead fill */
      text.setAttribute('stroke', '#fff');
      text.setAttribute('stroke-width', (fontSize * 0.12) + 'px');
      text.setAttribute('paint-order', 'stroke');
    }

    /* Show only the base letter (C/D/E…), not accidentals */
    text.textContent = info.name.charAt(0);
    headPath.parentNode.appendChild(text);
  });
}

/** Renderiza a partitura a partir do conteúdo do textarea. */
function render() {
  const input = document.getElementById('abc-input').value.trim();
  const outputDiv = document.getElementById('output');
  if (!input) {
    outputDiv.innerHTML =
      '<p style="color: red;">Por favor, insira a notação ABC para renderizar a partitura.</p>';
    return;
  }
  outputDiv.innerHTML = '';

  const processed = limitBarsPerLine(input, 2);

  const tuneObj = ABCJS.renderAbc(outputDiv, processed, {
    responsive: 'resize',
    staffwidth: 350,
    scale: 3,
    paddingtop: 20,
    paddingbottom: 20,
  });

  const svgEl = outputDiv.querySelector('svg');
  if (svgEl) postProcessSVG(svgEl, tuneObj);
}

/** Abre janela de impressão de stickers coloridos para todas as notas. */
function printStickers() {
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const stickers = [];
  for (let oct = 2; oct <= 5; oct++) {
    for (const n of notes) {
      stickers.push({
        name: n,
        nameLong: NOTE_NAMES_PT[n],
        octave: oct,
        color: noteToHSL(n, oct),
      });
    }
  }
  stickers.push({ name: 'C', nameLong: 'Dó', octave: 6, color: noteToHSL('C', 6) });

  let cells = '';
  for (const s of stickers) {
    const tc = hslIsBright(s.color) ? '#333' : '#fff';
    cells += `<div class="s" style="background:${s.color}; color:${tc};">` +
      `<span class="n">${s.name}</span>` +
      `<span class="l">${s.nameLong}</span>` +
      `<span class="o">${s.octave}</span>` +
      `</div>`;
  }

  const w = window.open('', '_blank');
  if (!w) {
    alert('Não foi possível abrir a janela de stickers. Por favor, permita pop-ups para este site.');
    return;
  }
  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Stickers de Notas Musicais</title>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #fff; padding: 1rem; }
    h1 { margin-bottom: 1rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 0.75rem; }
    .s { width: 15mm; height: 15mm; display: flex; flex-direction: column;
         align-items: center; justify-content: center; border-radius: 8px;
         padding: 0.25rem; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
    .n { font-size: 1.4rem; font-weight: bold; line-height: 1; }
    .l { font-size: 0.7rem; }
    .o { font-size: 0.65rem; opacity: 0.75; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Stickers de Notas Musicais</h1>
  <div class="grid">${cells}</div>
</body>
</html>`);
  w.document.close();
}

/* ── Event listeners ─────────────────────────────────────────────────── */
document.getElementById('render-btn').addEventListener('click', render);
document.getElementById('stickers-btn').addEventListener('click', printStickers);

document.getElementById('upload-btn').addEventListener('click', () => {
  document.getElementById('file-input').click();
});

document.getElementById('file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('file-name').textContent = file.name;
  const reader = new FileReader();
  reader.onload = (event) => {
    document.getElementById('abc-input').value = event.target.result;
    render();
  };
  reader.readAsText(file);
});

document.getElementById('abc-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    render();
  }
});

/* Allow Jest to import pure functions without a DOM */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NOTE_COLORS,
    NOTE_NAMES_PT,
    FLAT_TO_SHARP,
    noteToHSL,
    hslIsBright,
    flatToSharp,
    abcPitchToNote,
    limitBarsPerLine,
  };
}
