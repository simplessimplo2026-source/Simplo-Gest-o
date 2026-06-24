alter table public.ficha_servicos
  add column if not exists hora_manha_ini text,
  add column if not exists hora_manha_fim text,
  add column if not exists hora_tarde_ini text,
  add column if not exists hora_tarde_fim text;
