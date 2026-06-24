import assert from 'node:assert/strict';
import {
  brDateToISO,
  dateBR,
  getMonthBounds,
  isoToBRDate,
  localISODate,
  machineForFicha,
  machineForFuncionario,
  maskDateBR,
  minutesToDecimal,
  minutesToText,
  workMinutes,
} from '../src/lib/reports.js';
import { createXlsxBlob } from '../src/lib/xlsx.js';
import { escapeHtml } from '../src/lib/printHtml.js';
import {
  fichaPayload,
  hasServiceContent,
  machineInfoForOperator,
  newService,
  servicePayload,
} from '../src/features/ficha/fichaHelpers.js';
import { buildReportTotalRow } from '../src/features/relatorios/relatorioHelpers.js';

const sampleData = {
  clientes: [
    { id: 1, nome: 'Cliente QA Ltda', fantasia: 'Cliente QA', cidade: 'Cidade QA', tel: '47999999999' },
  ],
  funcionarios: [
    { id: 1, nome: 'Operador QA 1', maquina: 'Escavadeira QA 22ton' },
    { id: 2, nome: 'Operador QA 2', maquina: '' },
    { id: 3, nome: 'Motorista QA A', maquina: 'Caminhao Cacamba QA' },
    { id: 4, nome: 'Motorista QA B', maquina: 'Caminhao Cacamba QA' },
  ],
  equipamentos: [
    { id: 1, nome: 'Escavadeira QA 22ton', placa: 'QA220', operador: 'Operador QA 1' },
    { id: 2, nome: 'Caminhao Pipa QA', placa: 'QA001', operador: 'Operador QA 2' },
    { id: 3, nome: 'Caminhao Cacamba QA', placa: 'TRK-A', operador: 'Motorista QA A' },
    { id: 4, nome: 'Caminhao Cacamba QA', placa: 'TRK-B', operador: 'Motorista QA B' },
  ],
};

function bufferIncludes(bytes, text) {
  return Buffer.from(bytes).includes(Buffer.from(text));
}

async function testReportsHelpers() {
  assert.equal(dateBR('2026-06-07'), '07/06/2026');
  assert.equal(isoToBRDate('2026-06-07'), '07/06/2026');
  assert.equal(maskDateBR('07062026'), '07/06/2026');
  assert.equal(brDateToISO('07/06/2026'), '2026-06-07');
  assert.equal(brDateToISO('31/02/2026'), '');
  assert.equal(escapeHtml('Cliente <teste> & "obra"'), 'Cliente &lt;teste&gt; &amp; &quot;obra&quot;');
  assert.equal(localISODate(new Date(2026, 5, 7, 23, 30)), '2026-06-07');
  assert.deepEqual(getMonthBounds(new Date(2026, 5, 15)), { ini: '2026-06-01', fim: '2026-06-30' });
  assert.equal(workMinutes({ manha_ini: '07:00', manha_fim: '12:00', tarde_ini: '13:00', tarde_fim: '17:30' }), 570);
  assert.equal(workMinutes({ manha_ini: '22:00', manha_fim: '02:00' }), 240);
  assert.equal(minutesToText(65), '1h 05min');
  assert.equal(minutesToDecimal(90), '1,50');
  const geralTotalRow = buildReportTotalRow(['Data', 'Pedido', 'Cliente', 'Quantidade', 'Valor'], { qtd: 131, valor: 2500 });
  assert.deepEqual(geralTotalRow.slice(0, 4), ['TOTAL DO RELATÓRIO', '', '', '131']);
  assert.equal(geralTotalRow[4].replace(/\s/g, ' '), 'R$ 2.500,00');
  const pedidosTotalRow = buildReportTotalRow(['Pedido / Nota / Contrato', 'Clientes', 'Obras', 'Serviços', 'Valor'], { qtd: 131, servicos: 6, valor: 2500 });
  assert.deepEqual(pedidosTotalRow.slice(0, 4), ['TOTAL DO RELATÓRIO', '', '', '6']);
  assert.equal(pedidosTotalRow[4].replace(/\s/g, ' '), 'R$ 2.500,00');
  assert.equal(machineForFuncionario(sampleData.funcionarios[0], sampleData), 'Escavadeira QA 22ton');
  assert.equal(machineForFuncionario(sampleData.funcionarios[1], sampleData), 'Caminhao Pipa QA');
  assert.equal(machineForFuncionario(sampleData.funcionarios[3], sampleData), 'Caminhao Cacamba QA');
  assert.equal(machineForFicha({ operador: 'Operador QA 2', maquina: '' }, sampleData), 'Caminhao Pipa QA');
  assert.equal(machineForFicha({ operador: 'Operador QA 1', maquina: 'Mini Escavadeira QA' }, sampleData), 'Mini Escavadeira QA');
}

async function testFichaHelpers() {
  const info = machineInfoForOperator('Operador QA 1', sampleData);
  assert.deepEqual(info, {
    nome: 'Escavadeira QA 22ton',
    placa: 'QA220',
    padrao: 'Escavadeira QA 22ton',
  });
  assert.deepEqual(machineInfoForOperator('Motorista QA B', sampleData), {
    nome: 'Caminhao Cacamba QA',
    placa: 'TRK-B',
    padrao: 'Caminhao Cacamba QA',
  });

  const ficha = fichaPayload({
    data: '2026-06-07',
    codigo: '46017',
    turno: 'Dia completo',
    operador: 'Operador QA 1',
    maquina: '',
    maquinaMotivo: 'Troca temporária para serviço externo',
    manha_ini: '07:00',
    manha_fim: '12:00',
    tarde_ini: '13:00',
    tarde_fim: '17:00',
  }, sampleData);
  assert.equal(ficha.maquina, 'Escavadeira QA 22ton');
  assert.equal(ficha.maquina_motivo, 'Troca temporária para serviço externo');

  const diaria = servicePayload({
    ...newService({ localId: 'test-1' }),
    tipo: 'diaria',
    diaria: 'meia',
    cli_id: 1,
    nota_pedido: '46017',
    pago: true,
    valor: '150',
    tipo_pagamento: 'PIX',
  }, 99, sampleData);
  assert.equal(diaria.quantidade, 0.5);
  assert.equal(diaria.material, null);
  assert.equal(diaria.cliente, 'Cliente QA');
  assert.equal(diaria.endereco, 'Cidade QA');
  assert.equal(diaria.valor, 150);
  assert.equal(diaria.tipo_pagamento, 'PIX');

  const metragem = servicePayload({
    ...newService({ localId: 'test-2' }),
    tipo: 'metragem',
    quantidade: '1,5',
    material: 'Brita',
    cli_id: 1,
    pago: true,
    valor: '1.234,50',
  }, 99, sampleData);
  assert.equal(metragem.quantidade, 1.5);
  assert.equal(metragem.valor, 1234.5);

  const invalidNumbers = servicePayload({
    ...newService({ localId: 'test-3' }),
    tipo: 'quantidade',
    quantidade: 'abc',
    valor: 'abc',
  }, 99, sampleData);
  assert.equal(invalidNumbers.quantidade, null);
  assert.equal(invalidNumbers.valor, null);

  const blank = newService({ localId: 'blank', tipo: 'metragem' });
  assert.equal(hasServiceContent(blank), false);
  assert.equal(hasServiceContent({ ...blank, tipo: 'diaria' }), true);
}

async function testXlsxPackage() {
  const logoBytes = new Uint8Array(Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lM8HYQAAAABJRU5ErkJggg==',
    'base64',
  ));
  const rows = [
    ['BINHOTTI'],
    ['TERRAPLENAGEM'],
    ['Resumo geral'],
    ['Período: 01/06/2026 a 30/06/2026'],
    ['Lançamentos: 2', 'Quantidade: 18', 'Valor total: R$ 0,00'],
    ['Data', 'Pedido', 'Cliente', 'Obra', 'Máquina', 'Operador', 'Serviço', 'Quantidade', 'Valor'],
    ['06/06/2026', '46016', 'Cliente QA', 'Cidade QA', 'Escavadeira QA 22ton', 'Operador QA 1', 'Diária', '1 diária', 'R$ 0,00'],
    ['TOTAL DO RELATÓRIO', '', '', '', '', '', '', 1, 'R$ 0,00'],
  ];
  const blob = createXlsxBlob('QA Logo Excel', rows, { headerRow: 5, logoBytes });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.deepEqual(Array.from(bytes.slice(0, 4)), [80, 75, 3, 4]);
  assert.equal(bufferIncludes(bytes, 'docProps/core.xml'), true);
  assert.equal(bufferIncludes(bytes, 'docProps/app.xml'), true);
  assert.equal(bufferIncludes(bytes, 'xl/drawings/drawing1.xml'), true);
  assert.equal(bufferIncludes(bytes, 'xl/media/image1.png'), true);
  assert.equal(bufferIncludes(bytes, '<drawing r:id="rId1"/>'), true);
}

await testReportsHelpers();
await testFichaHelpers();
await testXlsxPackage();

console.log('QA smoke tests passed');
