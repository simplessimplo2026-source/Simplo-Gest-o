alter table public.materiais
  add column if not exists unidades text;

alter table public.ficha_servicos
  add column if not exists qtd_m3 numeric,
  add column if not exists qtd_m2 numeric,
  add column if not exists qtd_kg numeric,
  add column if not exists qtd_litro numeric,
  add column if not exists qtd_unidade numeric;
