-- Role atlas_rafael — acesso mínimo para o ATLAS
-- Criado em: 2026-10-19
-- Tabelas liberadas: produtos, configuracoes (SELECT, INSERT, UPDATE — sem DELETE)
-- Senha: gerada internamente via gen_random_bytes(32), armazenada APENAS no cofre de segredos
--        (GitHub Secret: ATLAS_RAFAEL_DB_URL). Nunca aparece neste arquivo, no chat ou em logs.

DO $$
DECLARE
  v_pass text := encode(gen_random_bytes(32), 'base64');
BEGIN
  EXECUTE format('CREATE ROLE atlas_rafael WITH LOGIN PASSWORD %L', v_pass);
  EXECUTE 'GRANT USAGE ON SCHEMA public TO atlas_rafael';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE public.produtos TO atlas_rafael';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE public.configuracoes TO atlas_rafael';
  RAISE NOTICE '=== COPIE A STRING DE CONEXÃO PARA O COFRE AGORA ===';
  RAISE NOTICE 'postgresql://atlas_rafael:%@db.rmsblsoqqhtantyomhsh.supabase.co:5432/postgres', v_pass;
  RAISE NOTICE '=====================================================';
END $$;

-- Verificação (sem expor senha):
-- SELECT rolname, rolcanlogin FROM pg_roles WHERE rolname = 'atlas_rafael';
-- Resultado esperado: atlas_rafael | true
