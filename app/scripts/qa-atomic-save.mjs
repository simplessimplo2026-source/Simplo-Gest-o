import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CLIENT_ID = '22222222-2222-4222-8222-222222222222';
const FICHA_ID = '33333333-3333-4333-8333-333333333333';
const SERVICE_ID = '44444444-4444-4444-8444-444444444444';
const REQUEST_ID = '55555555-5555-4555-8555-555555555555';

function request(overrides = {}) {
  return {
    request_id: REQUEST_ID,
    ficha_id: FICHA_ID,
    is_new: true,
    expected_revision: 0,
    ficha: { data: '2026-08-31', operador: 'Operador QA', maquina: 'Máquina QA', maq_motivo: null },
    servicos: [{
      id: SERVICE_ID,
      ficha_id: FICHA_ID,
      tipo: 'diaria',
      cliente: 'Cliente QA',
      cli_id: CLIENT_ID,
      diaria: 'completa',
      quantidade: 1,
      pago: false,
    }],
    original_service_ids: [],
    ...overrides,
  };
}

async function expectFailure(run, message) {
  await assert.rejects(run, new RegExp(message));
}

const db = new PGlite();
try {
  await db.exec(`
    CREATE SCHEMA auth;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT current_setting('request.jwt.claim.sub', true)::uuid
    $$;
    CREATE TABLE public.clientes (id uuid PRIMARY KEY, nome text);
    CREATE TABLE public.fichas (
      id uuid PRIMARY KEY, data date NOT NULL, codigo text, turno text, operador text, maquina text,
      maq_motivo text, manha_ini time, manha_fim time, tarde_ini time, tarde_fim time,
      hor_ini numeric, hor_fim numeric, km_ini integer, km_fim integer, diesel numeric,
      posto text, observacoes text, created_at timestamptz DEFAULT now()
    );
    CREATE TABLE public.ficha_servicos (
      id uuid PRIMARY KEY, ficha_id uuid REFERENCES public.fichas(id) ON DELETE CASCADE,
      tipo text, quantidade numeric, material text, barreiro text, cliente text, cli_id uuid REFERENCES public.clientes(id),
      endereco text, tel text, pago boolean DEFAULT false, valor numeric, tipo_pagamento text,
      diaria text, nota_pedido text, horas_trabalhadas text, hora_manha_ini text, hora_manha_fim text,
      hora_tarde_ini text, hora_tarde_fim text, qtd_m3 numeric, qtd_m2 numeric, qtd_kg numeric,
      qtd_litro numeric, qtd_unidade numeric, contrato_id text, contrato_nome text,
      modelo_cobranca text, valor_unitario numeric, valor_total numeric, created_at timestamptz DEFAULT now()
    );
    INSERT INTO auth.users(id) VALUES ('${USER_ID}');
    INSERT INTO public.clientes(id, nome) VALUES ('${CLIENT_ID}', 'Cliente QA');
    SELECT set_config('request.jwt.claim.sub', '${USER_ID}', false);
  `);
  let migration = await readFile(new URL('../../supabase-save-ficha-atomic.sql', import.meta.url), 'utf8');
  migration = migration.replace("NOTIFY pgrst, 'reload schema';", '');
  await db.exec(migration);

  const invalid = request({ servicos: [{ ...request().servicos[0], cli_id: null }] });
  await expectFailure(() => db.query('SELECT public.save_ficha_atomic($1)', [invalid]), 'Selecione o cliente');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.fichas')).rows[0].count, 0,
    'a falha do serviço não pode criar somente o cabeçalho');

  const missingClient = request({
    request_id: '88888888-8888-4888-8888-888888888888',
    servicos: [{ ...request().servicos[0], cli_id: '99999999-9999-4999-8999-999999999999' }],
  });
  await expectFailure(() => db.query('SELECT public.save_ficha_atomic($1)', [missingClient]), 'foreign key');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.fichas')).rows[0].count, 0,
    'um cliente inexistente também deve desfazer toda a ficha');

  const saved = await db.query('SELECT public.save_ficha_atomic($1) AS result', [request()]);
  assert.equal(saved.rows[0].result.ficha.id, FICHA_ID);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.fichas')).rows[0].count, 1);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.ficha_servicos')).rows[0].count, 1);

  const retried = await db.query('SELECT public.save_ficha_atomic($1) AS result', [request()]);
  assert.deepEqual(retried.rows[0].result, saved.rows[0].result, 'a repetição da mesma solicitação é idempotente');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM public.ficha_servicos')).rows[0].count, 1);

  const changed = request({ ficha: { ...request().ficha, codigo: 'DIFERENTE' } });
  await expectFailure(() => db.query('SELECT public.save_ficha_atomic($1)', [changed]), 'Tentativa reutilizada');

  const edit = request({
    request_id: '66666666-6666-4666-8666-666666666666',
    is_new: false,
    expected_revision: 1,
    ficha: { ...request().ficha, codigo: 'Atualizada' },
    original_service_ids: [SERVICE_ID],
    servicos: [{ ...request().servicos[0], quantidade: 0.5 }],
  });
  await db.query('SELECT public.save_ficha_atomic($1)', [edit]);
  assert.equal((await db.query('SELECT save_revision FROM public.fichas')).rows[0].save_revision, 2);
  assert.equal(Number((await db.query('SELECT quantidade FROM public.ficha_servicos')).rows[0].quantidade), 0.5);

  const stale = { ...edit, request_id: '77777777-7777-4777-8777-777777777777', expected_revision: 1 };
  await expectFailure(() => db.query('SELECT public.save_ficha_atomic($1)', [stale]), 'outra sessão');
  console.log('QA atomic save passed');
} finally {
  await db.close();
}
