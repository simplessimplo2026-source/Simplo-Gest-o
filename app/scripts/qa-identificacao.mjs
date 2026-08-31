import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

// Exercise the actual report datasets used for screen/PDF/Excel without adding
// test-only exports to the application or connecting to the database.
async function loadComponent(relativePath, extraSource) {
  const path = new URL(relativePath, import.meta.url);
  const source = await readFile(path, 'utf8');
  const result = await build({
    stdin: { contents: `${source}\n${extraSource}`, loader: 'jsx', resolveDir: fileURLToPath(new URL('.', path)) },
    bundle: true, write: false, format: 'esm', platform: 'node',
    banner: { js: `import { createRequire } from 'node:module'; const require = createRequire(${JSON.stringify(import.meta.url)});` },
    define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{}' },
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

const { buildRows, datasetForTab, reportFields } = await loadComponent(
  '../src/features/relatorios/RelatoriosPage.jsx', 'export { buildRows, datasetForTab, reportFields };',
);
for (const [codigo, pedido] of [['TESTE-001', '43361'], ['TESTE-001', ''], ['', '43361'], ['', '']]) {
  const data = {
    fichas: [{ id: 1, codigo, data: '2026-08-31' }],
    ficha_servicos: [{ id: 2, ficha_id: 1, nota_pedido: pedido, tipo: 'diaria', diaria: 'completa', valor_total: 200 }],
  };
  const rows = buildRows(data, {});
  assert.equal(rows.length, 1, 'Missing identification must not hide a service');
  assert.equal(rows[0].codigo, codigo);
  assert.equal(rows[0].pedido, pedido, 'Never substitute ficha code for order number');
  assert.equal(rows[0].valor, 200);
  const dataset = datasetForTab('geral', rows);
  assert.equal(dataset.body[0][dataset.headers.indexOf('Código da ficha')], codigo || 'Sem código');
  assert.equal(dataset.body[0][dataset.headers.indexOf('Nº Pedido / Nota')], pedido || 'Não informado');
  assert.equal(reportFields.find((field) => field.id === 'pedido').value(rows[0]), pedido || 'Não informado');
  assert.equal(datasetForTab('pedidos', rows).body[0][0], pedido || 'Sem pedido');
  if (codigo) assert.equal(buildRows(data, { busca: codigo }).length, 1);
  if (pedido) assert.equal(buildRows(data, { busca: pedido }).length, 1);
}

const { renderTestList } = await loadComponent('../src/features/ficha/FichaPage.jsx', `
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export function renderTestList() {
  return renderToStaticMarkup(<FichaPage data={{ fichas: [{ id: 99, codigo: '', data: '2026-08-31' }] }} onReload={() => {}} />);
}
`);
const html = renderTestList();
assert.ok(html.includes('Sem código'));
assert.ok(!html.includes('>01</td>'), 'List position must not appear as the ficha code');
console.log('Identification QA passed: independent code/order, missing fields, searches, report datasets and ficha list.');
