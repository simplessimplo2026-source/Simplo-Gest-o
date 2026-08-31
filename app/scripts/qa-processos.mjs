import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { persistServices } from '../src/features/ficha/persistServices.js';
import { matchContractEquipment, resolveServiceClient, resolveServiceContract } from '../src/lib/serviceLinks.js';
import { servicePayload, newService } from '../src/features/ficha/fichaHelpers.js';

async function component(path, exports) {
  const url = new URL(path, import.meta.url);
  const result = await build({
    stdin: { contents: (await readFile(url, 'utf8')) + `\nexport { ${exports} };`, loader: 'jsx', resolveDir: fileURLToPath(new URL('.', url)) },
    bundle: true, write: false, format: 'esm', platform: 'node',
    banner: { js: `import { createRequire } from 'node:module'; const require = createRequire(${JSON.stringify(import.meta.url)});` },
    define: { 'process.env.NODE_ENV': '"test"', 'import.meta.env': '{}' },
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

try {
  const contract = { id: 'obra', nome: 'Orla', valor_diaria: 900, equipamentos: [
    { equipamento_id: 1, equipamento_nome: 'Caminhão', equipamento_placa: 'AAA', valor_diaria: 100 },
    { equipamento_id: 2, equipamento_nome: 'Caminhão', equipamento_placa: 'BBB', valor_diaria: 0 },
  ] };
  const equipment = { id: 2, nome: 'Caminhão', placa: 'BBB' };
  assert.equal(matchContractEquipment(contract, equipment)?.valor_diaria, 0);
  assert.equal(matchContractEquipment(contract, null), null);
  assert.equal(matchContractEquipment(contract, { id: 3, nome: 'Caminhão', placa: 'CCC' }), null);
  const cliente = { id: 1, nome: 'Cliente', contratos_servicos: [contract] };
  assert.equal(resolveServiceClient({ cli_id: 9, cliente: 'Cliente' }, [cliente]), null);
  assert.equal(resolveServiceClient({ cliente: 'Cliente' }, [cliente, { id: 2, nome: 'Cliente' }]), null);
  assert.equal(resolveServiceClient({ cliente_id: 1 }, [cliente]), cliente);
  assert.equal(resolveServiceContract({ contrato_id: 'excluida:diaria', contrato_nome: 'Orla' }, cliente), null);
  assert.equal(resolveServiceContract({ contrato_id: 'obra:diaria' }, cliente), contract);

  const events = [];
  let failure;
  try {
    await persistServices([{ id: 1 }, { localId: 'new1' }, { localId: 'new2' }], [1, 2], {
      save: async (row) => { events.push(`save:${row.id || row.localId}`); if (row.localId === 'new2') throw new Error('offline'); return { id: row.id || 3 }; },
      remove: async (id) => events.push(`remove:${id}`),
    });
  } catch (error) { failure = error; }
  assert.equal(failure.message, 'offline');
  assert.equal(failure.services[1].id, 3);
  assert.ok(!events.some((event) => event.startsWith('remove:')), 'Never delete old services before writes succeed');
  events.length = 0;
  await persistServices(failure.services, [1, 2], {
    save: async (row) => { events.push(`save:${row.id || row.localId}`); return { id: row.id || 4 }; },
    remove: async (id) => events.push(`remove:${id}`),
  });
  assert.deepEqual(events, ['save:1', 'save:3', 'save:new2', 'remove:2']);

  const modal = await component('../src/features/ficha/FichaModal.jsx', 'contractValueForEquipment, bestContractOption, serviceChargeTotal');
  assert.equal(modal.contractValueForEquipment(contract, equipment, 'diaria'), 0);
  assert.equal(modal.bestContractOption([contract], equipment, 'diaria', 'excluida:diaria'), null);
  assert.equal(modal.serviceChargeTotal({ tipo: 'diaria', diaria: 'completa', valor_unitario: 0, valor_total: 900 }), 0);
  const saved = servicePayload(newService({ tipo: 'diaria', valor_unitario: 0, valor_total: 900 }), 1, {});
  assert.equal(saved.valor_total, 0);

  const report = await component('../src/features/relatorios/RelatoriosPage.jsx', 'buildRows');
  const rows = report.buildRows({
    clientes: [cliente], equipamentos: [equipment],
    fichas: [{ id: 1, maquina: 'Caminhão - BBB' }],
    ficha_servicos: [{ ...saved, cliente_id: 1, contrato_id: 'obra:diaria' }],
  }, { cliente: '1' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].valor_unitario, 0);
  assert.equal(rows[0].valor, 0);
  assert.equal(rows[0].obra, 'Orla');
  const obras = await component('../src/features/obras/ObrasPage.jsx', 'normalizeContracts, serviceBelongsToObra');
  assert.equal(obras.normalizeContracts([{ id: 'special', equipamentos: [{ valor_diaria: 100 }] }])[0].valor_diaria, '');
  assert.equal(obras.normalizeContracts([{ id: 'zero', valor_diaria: 0, valor: 900 }])[0].valor_diaria, '0');
  assert.equal(obras.serviceBelongsToObra({ cli_id: 2, contrato_id: 'obra:diaria' }, contract, cliente), false);
  assert.equal(obras.serviceBelongsToObra({ cli_id: 1, contrato_id: 'obra:diaria' }, contract, cliente), true);
  console.log('Process QA passed: stable service IDs, partial failure/retry, strict links, zero values and work history.');
} catch (error) {
  console.error(error.name, error.message);
  process.exitCode = 1;
}
