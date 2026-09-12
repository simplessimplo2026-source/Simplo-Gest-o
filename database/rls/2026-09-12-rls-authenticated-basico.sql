-- Seguranca basica para o app Binhotti
-- Objetivo: bloquear acesso anonimo e permitir CRUD apenas para usuarios autenticados.
-- Rode somente depois de configurar Supabase Auth e criar pelo menos um usuario.

alter table public.clientes enable row level security;
alter table public.equipamentos enable row level security;
alter table public.funcionarios enable row level security;
alter table public.materiais enable row level security;
alter table public.barreiros enable row level security;
alter table public.orcamentos enable row level security;
alter table public.fichas enable row level security;
alter table public.ficha_servicos enable row level security;

drop policy if exists "authenticated_select" on public.clientes;
drop policy if exists "authenticated_insert" on public.clientes;
drop policy if exists "authenticated_update" on public.clientes;
drop policy if exists "authenticated_delete" on public.clientes;

drop policy if exists "authenticated_select" on public.equipamentos;
drop policy if exists "authenticated_insert" on public.equipamentos;
drop policy if exists "authenticated_update" on public.equipamentos;
drop policy if exists "authenticated_delete" on public.equipamentos;

drop policy if exists "authenticated_select" on public.funcionarios;
drop policy if exists "authenticated_insert" on public.funcionarios;
drop policy if exists "authenticated_update" on public.funcionarios;
drop policy if exists "authenticated_delete" on public.funcionarios;

drop policy if exists "authenticated_select" on public.materiais;
drop policy if exists "authenticated_insert" on public.materiais;
drop policy if exists "authenticated_update" on public.materiais;
drop policy if exists "authenticated_delete" on public.materiais;

drop policy if exists "authenticated_select" on public.barreiros;
drop policy if exists "authenticated_insert" on public.barreiros;
drop policy if exists "authenticated_update" on public.barreiros;
drop policy if exists "authenticated_delete" on public.barreiros;

drop policy if exists "authenticated_select" on public.orcamentos;
drop policy if exists "authenticated_insert" on public.orcamentos;
drop policy if exists "authenticated_update" on public.orcamentos;
drop policy if exists "authenticated_delete" on public.orcamentos;

drop policy if exists "authenticated_select" on public.fichas;
drop policy if exists "authenticated_insert" on public.fichas;
drop policy if exists "authenticated_update" on public.fichas;
drop policy if exists "authenticated_delete" on public.fichas;

drop policy if exists "authenticated_select" on public.ficha_servicos;
drop policy if exists "authenticated_insert" on public.ficha_servicos;
drop policy if exists "authenticated_update" on public.ficha_servicos;
drop policy if exists "authenticated_delete" on public.ficha_servicos;

create policy "authenticated_select" on public.clientes for select to authenticated using (true);
create policy "authenticated_insert" on public.clientes for insert to authenticated with check (true);
create policy "authenticated_update" on public.clientes for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.clientes for delete to authenticated using (true);

create policy "authenticated_select" on public.equipamentos for select to authenticated using (true);
create policy "authenticated_insert" on public.equipamentos for insert to authenticated with check (true);
create policy "authenticated_update" on public.equipamentos for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.equipamentos for delete to authenticated using (true);

create policy "authenticated_select" on public.funcionarios for select to authenticated using (true);
create policy "authenticated_insert" on public.funcionarios for insert to authenticated with check (true);
create policy "authenticated_update" on public.funcionarios for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.funcionarios for delete to authenticated using (true);

create policy "authenticated_select" on public.materiais for select to authenticated using (true);
create policy "authenticated_insert" on public.materiais for insert to authenticated with check (true);
create policy "authenticated_update" on public.materiais for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.materiais for delete to authenticated using (true);

create policy "authenticated_select" on public.barreiros for select to authenticated using (true);
create policy "authenticated_insert" on public.barreiros for insert to authenticated with check (true);
create policy "authenticated_update" on public.barreiros for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.barreiros for delete to authenticated using (true);

create policy "authenticated_select" on public.orcamentos for select to authenticated using (true);
create policy "authenticated_insert" on public.orcamentos for insert to authenticated with check (true);
create policy "authenticated_update" on public.orcamentos for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.orcamentos for delete to authenticated using (true);

create policy "authenticated_select" on public.fichas for select to authenticated using (true);
create policy "authenticated_insert" on public.fichas for insert to authenticated with check (true);
create policy "authenticated_update" on public.fichas for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.fichas for delete to authenticated using (true);

create policy "authenticated_select" on public.ficha_servicos for select to authenticated using (true);
create policy "authenticated_insert" on public.ficha_servicos for insert to authenticated with check (true);
create policy "authenticated_update" on public.ficha_servicos for update to authenticated using (true) with check (true);
create policy "authenticated_delete" on public.ficha_servicos for delete to authenticated using (true);
