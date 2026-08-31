-- Aplicar antes de publicar o app. Não altera lançamentos existentes.
BEGIN;
ALTER TABLE public.fichas ADD COLUMN IF NOT EXISTS save_revision bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS public.ficha_save_requests (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  request_id uuid NOT NULL,
  payload jsonb NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id)
);
ALTER TABLE public.ficha_save_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS own_save_requests_select ON public.ficha_save_requests;
CREATE POLICY own_save_requests_select ON public.ficha_save_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS own_save_requests_insert ON public.ficha_save_requests;
CREATE POLICY own_save_requests_insert ON public.ficha_save_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
REVOKE ALL ON public.ficha_save_requests FROM anon, authenticated;
GRANT SELECT, INSERT ON public.ficha_save_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.save_ficha_atomic(p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $fn$
DECLARE
  v_user uuid := auth.uid();
  v_request_id uuid := (p_request->>'request_id')::uuid;
  v_id uuid := (p_request->>'ficha_id')::uuid;
  v_new boolean := (p_request->>'is_new')::boolean;
  v_ficha public.fichas%ROWTYPE;
  v_header public.fichas%ROWTYPE;
  v_service public.ficha_servicos%ROWTYPE;
  v_item jsonb;
  v_existing jsonb;
  v_result jsonb;
  v_previous public.ficha_save_requests%ROWTYPE;
  v_ids uuid[] := '{}';
  v_original uuid[];
  v_current uuid[];
  v_owner uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sessão inválida.'; END IF;
  IF v_request_id IS NULL OR v_id IS NULL OR v_new IS NULL THEN
    RAISE EXCEPTION 'Identificação da operação incompleta.';
  END IF;
  IF jsonb_typeof(p_request->'ficha') IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_request->'servicos') IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_request->'original_service_ids') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Formato da ficha ou dos serviços inválido.';
  END IF;
  IF jsonb_array_length(p_request->'servicos') < 1 THEN
    RAISE EXCEPTION 'Informe pelo menos um serviço.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_user::text || ':' || v_request_id::text, 0));
  SELECT * INTO v_previous FROM public.ficha_save_requests WHERE user_id = v_user AND request_id = v_request_id;
  IF FOUND THEN
    IF v_previous.payload <> p_request THEN RAISE EXCEPTION 'Tentativa reutilizada com dados diferentes. Reabra a ficha.'; END IF;
    RETURN v_previous.result;
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_request->'ficha') AS keys(key)
    WHERE key <> ALL(ARRAY['data','codigo','turno','operador','maquina','maq_motivo','manha_ini','manha_fim','tarde_ini','tarde_fim','hor_ini','hor_fim','km_ini','km_fim','diesel','posto','observacoes'])) THEN
    RAISE EXCEPTION 'Campo da ficha não reconhecido. Atualize o app.';
  END IF;
  v_header := jsonb_populate_record(NULL::public.fichas, p_request->'ficha');
  IF v_header.data IS NULL OR nullif(btrim(v_header.operador), '') IS NULL OR nullif(btrim(v_header.maquina), '') IS NULL THEN
    RAISE EXCEPTION 'Informe data, operador e máquina.';
  END IF;
  SELECT coalesce(array_agg(value::uuid ORDER BY value::uuid), '{}') INTO v_original
    FROM jsonb_array_elements_text(p_request->'original_service_ids');
  IF v_new THEN
    IF cardinality(v_original) <> 0 THEN RAISE EXCEPTION 'Ficha nova com serviços antigos.'; END IF;
    INSERT INTO public.fichas (id, data, codigo, turno, operador, maquina, maq_motivo, manha_ini, manha_fim, tarde_ini, tarde_fim, hor_ini, hor_fim, km_ini, km_fim, diesel, posto, observacoes, save_revision)
      VALUES (v_id, v_header.data, v_header.codigo, v_header.turno, v_header.operador, v_header.maquina, v_header.maq_motivo, v_header.manha_ini, v_header.manha_fim, v_header.tarde_ini, v_header.tarde_fim, v_header.hor_ini, v_header.hor_fim, v_header.km_ini, v_header.km_fim, v_header.diesel, v_header.posto, v_header.observacoes, 1) RETURNING * INTO v_ficha;
  ELSE
    SELECT * INTO v_ficha FROM public.fichas WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Ficha não encontrada ou sem permissão.'; END IF;
    IF (p_request->>'expected_revision')::bigint IS DISTINCT FROM v_ficha.save_revision THEN
      RAISE EXCEPTION 'A ficha foi alterada em outra sessão. Reabra antes de salvar.';
    END IF;
    SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO v_current FROM public.ficha_servicos WHERE ficha_id = v_id;
    IF v_original IS DISTINCT FROM v_current THEN RAISE EXCEPTION 'Os serviços mudaram. Reabra a ficha antes de salvar.'; END IF;
    UPDATE public.fichas SET data = v_header.data, codigo = v_header.codigo, turno = v_header.turno, operador = v_header.operador, maquina = v_header.maquina, maq_motivo = v_header.maq_motivo, manha_ini = v_header.manha_ini, manha_fim = v_header.manha_fim, tarde_ini = v_header.tarde_ini, tarde_fim = v_header.tarde_fim, hor_ini = v_header.hor_ini, hor_fim = v_header.hor_fim, km_ini = v_header.km_ini, km_fim = v_header.km_fim, diesel = v_header.diesel, posto = v_header.posto, observacoes = v_header.observacoes,
      save_revision = save_revision + 1 WHERE id = v_id RETURNING * INTO v_ficha;
    IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão para atualizar a ficha.'; END IF;
  END IF;
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_request->'servicos') LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Serviço inválido.'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(v_item) AS keys(key)
      WHERE key <> ALL(ARRAY['id','ficha_id','tipo','quantidade','material','barreiro','cliente','cli_id','endereco','tel','pago','valor','tipo_pagamento','diaria','nota_pedido','horas_trabalhadas','hora_manha_ini','hora_manha_fim','hora_tarde_ini','hora_tarde_fim','qtd_m3','qtd_m2','qtd_kg','qtd_litro','qtd_unidade','contrato_id','contrato_nome','modelo_cobranca','valor_unitario','valor_total'])) THEN
      RAISE EXCEPTION 'Campo de serviço não reconhecido. Atualize o app.';
    END IF;
    IF v_item->>'ficha_id' IS DISTINCT FROM v_id::text THEN RAISE EXCEPTION 'Serviço vinculado a outra ficha.'; END IF;
    v_service := jsonb_populate_record(NULL::public.ficha_servicos, v_item);
    IF v_service.id IS NULL OR v_service.id = ANY(v_ids) THEN RAISE EXCEPTION 'ID de serviço ausente ou repetido.'; END IF;
    IF v_service.cli_id IS NULL OR nullif(btrim(v_service.cliente), '') IS NULL
      OR v_service.tipo NOT IN ('hora','diaria','metragem','quantidade') OR v_service.tipo IS NULL THEN
      RAISE EXCEPTION 'Selecione o cliente e o tipo de cada serviço.';
    END IF;
    SELECT ficha_id INTO v_owner FROM public.ficha_servicos WHERE id = v_service.id;
    IF FOUND THEN
      IF v_owner IS DISTINCT FROM v_id OR NOT (v_service.id = ANY(v_original)) THEN
        RAISE EXCEPTION 'O serviço não pertence a esta edição.';
      END IF;
      UPDATE public.ficha_servicos SET tipo = v_service.tipo, quantidade = v_service.quantidade, material = v_service.material, barreiro = v_service.barreiro, cliente = v_service.cliente, cli_id = v_service.cli_id, endereco = v_service.endereco, tel = v_service.tel, pago = v_service.pago, valor = v_service.valor, tipo_pagamento = v_service.tipo_pagamento, diaria = v_service.diaria, nota_pedido = v_service.nota_pedido, horas_trabalhadas = v_service.horas_trabalhadas, hora_manha_ini = v_service.hora_manha_ini, hora_manha_fim = v_service.hora_manha_fim, hora_tarde_ini = v_service.hora_tarde_ini, hora_tarde_fim = v_service.hora_tarde_fim, qtd_m3 = v_service.qtd_m3, qtd_m2 = v_service.qtd_m2, qtd_kg = v_service.qtd_kg, qtd_litro = v_service.qtd_litro, qtd_unidade = v_service.qtd_unidade, contrato_id = v_service.contrato_id, contrato_nome = v_service.contrato_nome, modelo_cobranca = v_service.modelo_cobranca, valor_unitario = v_service.valor_unitario, valor_total = v_service.valor_total
        WHERE id = v_service.id AND ficha_id = v_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão para atualizar o serviço.'; END IF;
    ELSE
      IF v_service.id = ANY(v_original) THEN RAISE EXCEPTION 'Serviço original não encontrado.'; END IF;
      INSERT INTO public.ficha_servicos (id, ficha_id, tipo, quantidade, material, barreiro, cliente, cli_id, endereco, tel, pago, valor, tipo_pagamento, diaria, nota_pedido, horas_trabalhadas, hora_manha_ini, hora_manha_fim, hora_tarde_ini, hora_tarde_fim, qtd_m3, qtd_m2, qtd_kg, qtd_litro, qtd_unidade, contrato_id, contrato_nome, modelo_cobranca, valor_unitario, valor_total)
        VALUES (v_service.id, v_id, v_service.tipo, v_service.quantidade, v_service.material, v_service.barreiro, v_service.cliente, v_service.cli_id, v_service.endereco, v_service.tel, v_service.pago, v_service.valor, v_service.tipo_pagamento, v_service.diaria, v_service.nota_pedido, v_service.horas_trabalhadas, v_service.hora_manha_ini, v_service.hora_manha_fim, v_service.hora_tarde_ini, v_service.hora_tarde_fim, v_service.qtd_m3, v_service.qtd_m2, v_service.qtd_kg, v_service.qtd_litro, v_service.qtd_unidade, v_service.contrato_id, v_service.contrato_nome, v_service.modelo_cobranca, v_service.valor_unitario, v_service.valor_total);
    END IF;
    v_ids := array_append(v_ids, v_service.id);
  END LOOP;
  DELETE FROM public.ficha_servicos WHERE ficha_id = v_id AND id = ANY(v_original) AND NOT (id = ANY(v_ids));
  SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO v_current FROM public.ficha_servicos WHERE ficha_id = v_id;
  IF v_current IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(v_ids) x) THEN
    RAISE EXCEPTION 'Não foi possível confirmar todos os serviços.';
  END IF;
  v_result := jsonb_build_object('ficha', to_jsonb(v_ficha), 'service_ids', to_jsonb(v_ids));
  INSERT INTO public.ficha_save_requests(user_id, request_id, payload, result) VALUES(v_user, v_request_id, p_request, v_result);
  RETURN v_result;
END;
$fn$;
REVOKE ALL ON FUNCTION public.save_ficha_atomic(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_ficha_atomic(jsonb) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
