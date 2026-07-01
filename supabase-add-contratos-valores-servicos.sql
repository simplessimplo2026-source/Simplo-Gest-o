alter table public.clientes
  add column if not exists contratos_servicos jsonb not null default '[]'::jsonb;

alter table public.ficha_servicos
  add column if not exists contrato_id text,
  add column if not exists contrato_nome text,
  add column if not exists modelo_cobranca text,
  add column if not exists valor_unitario numeric,
  add column if not exists valor_total numeric;
