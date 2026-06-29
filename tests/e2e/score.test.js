const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const ABC_CONTENT = `X:1
T:Teste
M:4/4
L:1/4
K:C
C D E F|G A B c|
`;

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
});

test('renderiza partitura com ABC padrão', async ({ page }) => {
  await page.click('#render-btn');
  await expect(page.locator('#output svg')).toBeVisible();
});

test('mostra erro com input vazio', async ({ page }) => {
  await page.locator('#abc-input').fill('');
  await page.click('#render-btn');
  const errorParagraph = page.locator('#output p').filter({
    has: page.locator(':scope'),
  });
  // Verifica que existe um parágrafo com cor vermelha indicando erro
  const redParagraph = page.locator('#output p').first();
  await expect(redParagraph).toBeVisible();
  const color = await redParagraph.evaluate((el) => getComputedStyle(el).color);
  // Verifica que a cor tem componente vermelho dominante (rgb com r alto)
  expect(color).toMatch(/rgb\((?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d),\s*(?:[0-9]|[1-9]\d),\s*(?:[0-9]|[1-9]\d)\)/);
});

test('renderiza com Ctrl+Enter', async ({ page }) => {
  await page.locator('#abc-input').focus();
  await page.keyboard.press('Control+Enter');
  await expect(page.locator('#output svg')).toBeVisible();
});

test('cabeças de nota têm atributo fill colorido', async ({ page }) => {
  await page.click('#render-btn');
  await expect(page.locator('#output svg')).toBeVisible();

  const noteheads = page.locator('#output svg path.abcjs-notehead');
  const count = await noteheads.count();
  expect(count).toBeGreaterThan(0);

  let foundColored = false;
  for (let i = 0; i < count; i++) {
    const fill = await noteheads.nth(i).getAttribute('fill');
    if (fill && fill !== 'black' && fill !== '') {
      foundColored = true;
      break;
    }
  }
  expect(foundColored).toBe(true);
});

test('texto das notas aparece no SVG', async ({ page }) => {
  await page.click('#render-btn');
  await expect(page.locator('#output svg')).toBeVisible();

  const textElements = page.locator('#output svg text');
  await expect(textElements.first()).toBeVisible();
});

test('botão de upload existe e é clicável', async ({ page }) => {
  const uploadBtn = page.locator('#upload-btn');
  await expect(uploadBtn).toBeVisible();
  await expect(uploadBtn).toBeEnabled();
});

test('nome do arquivo aparece após seleção', async ({ page }) => {
  const tmpDir = '/tmp/playwright-abc-test';
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  const tmpFile = path.join(tmpDir, 'teste.abc');
  fs.writeFileSync(tmpFile, ABC_CONTENT, 'utf8');

  await page.setInputFiles('#file-input', tmpFile);

  const fileName = page.locator('#file-name');
  await expect(fileName).toBeVisible();
  await expect(fileName).toContainText('teste.abc');

  fs.unlinkSync(tmpFile);
});
