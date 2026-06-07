-- Reset seguro das politicas RLS do app Binhotti
-- Remove todas as politicas antigas das tabelas principais e recria acesso apenas para usuarios autenticados.

do $$
declare
  t text;
  p record;
  tables text[] := array[
    'clientes',
    'equipamentos',
    'funcionarios',
    'materiais',
    'barreiros',
    'orcamentos',
    'fichas',
    'ficha_servicos'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);

    for p in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;

    execute format('create policy authenticated_select on public.%I for select to authenticated using (true)', t);
    execute format('create policy authenticated_insert on public.%I for insert to authenticated with check (true)', t);
    execute format('create policy authenticated_update on public.%I for update to authenticated using (true) with check (true)', t);
    execute format('create policy authenticated_delete on public.%I for delete to authenticated using (true)', t);
  end loop;
end $$;

-- Conferencia: esta consulta deve mostrar apenas authenticated nos roles.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'clientes',
    'equipamentos',
    'funcionarios',
    'materiais',
    'barreiros',
    'orcamentos',
    'fichas',
    'ficha_servicos'
  )
order by tablename, policyname;
