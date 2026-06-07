alter table public.ficha_servicos
add column if not exists nota_pedido text;

comment on column public.ficha_servicos.nota_pedido
is 'Numero da nota/pedido individual do servico dentro da ficha diaria.';
