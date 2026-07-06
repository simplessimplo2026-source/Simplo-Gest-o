alter table public.clientes
  add column if not exists contratos_servicos jsonb default '[]'::jsonb;
