
-- Restrict execute on internal trigger functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
-- Keep match function callable by authenticated only
REVOKE EXECUTE ON FUNCTION public.match_document_chunks(vector, uuid, int) FROM PUBLIC, anon;

-- Move vector extension to its own schema
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;
GRANT USAGE ON SCHEMA extensions TO authenticated, service_role, anon;
