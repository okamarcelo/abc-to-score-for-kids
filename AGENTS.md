# AGENTS.md — abc-to-score-for-kids

## Propósito
Aplicação web educacional que converte notação ABC em partituras coloridas para crianças aprenderem leitura musical. Cada nota recebe uma cor única e seu nome é exibido dentro da cabeça da nota.

## Estrutura
```
musicscoreforkids/
├── index.html          # HTML principal (referencia src/)
├── src/
│   ├── style.css       # Estilos
│   └── app.js          # Lógica de renderização (sem dependências de build)
├── tests/
│   ├── unit/           # Testes Jest para funções puras
│   │   └── music.test.js
│   └── e2e/            # Testes Playwright para interface
│       └── score.test.js
├── dist/
│   └── score.html      # HTML consolidado (gerado por build.sh/build.bat)
├── docs/
│   └── index.html      # Cópia do dist para GitHub Pages
├── build.sh            # Script de build para Linux/Mac
├── build.bat           # Script de build para Windows
├── package.json
├── jest.config.js
└── playwright.config.js
```

## Dependências externas
- **abcjs 6.4.4** (`cdn.jsdelivr.net`) — renderiza notação ABC em SVG
- **Google Fonts** — Nunito (rótulos das notas)

## Lógica de cores das notas
Cada nota musical recebe uma cor HSL baseada em `NOTE_COLORS` (mapa de nota → matiz):
- C=0°, D=30°, E=60°, F=120°, G=190°, A=240°, B=280°
- A claridade varia por oitava: oitava 4 = 50%, cada oitava acima/abaixo ±20%
- Notas curtas (< 0.5): preenchidas com a cor da nota
- Notas longas (≥ 0.5, semínima e mais): preenchidas com cor, borda mais grossa

## Fluxo de renderização
1. Usuário digita ABC ou carrega arquivo `.abc`/`.txt`/`.md`
2. `limitBarsPerLine` reestrutura para no máximo 2 compassos por linha
3. `ABCJS.renderAbc` gera o SVG no `#output`
4. `postProcessSVG` percorre o engraver para mapear notas → elementos SVG
5. Para cada cabeça de nota: aplica cor HSL + adiciona `<text>` com o nome da nota

## Regras para agentes
- Não usar frameworks de build (Webpack, Vite etc.) — o projeto deve rodar sem `npm run build` via CDN
- O arquivo `src/app.js` deve ser autocontido (não usa `import/export` no browser)
- Para testes Jest, use `module.exports` em um bloco `if (typeof module !== 'undefined')`
- Testes e2e usam Playwright com servidor estático local
- O `dist/score.html` é gerado pelos scripts de build inline (sem dependências de build)
- Manter compatibilidade com a API pública do abcjs 6.x

## GitHub Pages
- Branch `main` → pasta `docs/` é servida como GitHub Pages
- URL pública: `https://okamarcelo.github.io/abc-to-score-for-kids/`
- O `build.sh`/`build.bat` copia `dist/score.html` para `docs/index.html`
