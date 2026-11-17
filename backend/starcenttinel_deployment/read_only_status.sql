-- Build 218. Already deployed to independent Supabase ca-central-1 project.
-- Read-only security snapshot. No owner claims or revocations are invented.
CREATE OR REPLACE FUNCTION public.starcenttinel_security_snapshot()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER
SET search_path=pg_catalog,starcenttinel_private
AS $$
  SELECT jsonb_build_object(
    'service','starcenttinel-security-control',
    'state',cs.mode,'revision',cs.revision,
    'external_authority_verified',cs.external_authority_verified,
    'owner_webauthn_verified',false,
    'provider_revocation_verified',false,
    'portal_enforcement_count',0,
    'ready_for_live_actions',false,
    'recorded_at',cs.updated_at
  )
  FROM starcenttinel_private.control_state cs WHERE cs.singleton=1
$$;
REVOKE ALL ON FUNCTION public.starcenttinel_security_snapshot() FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA starcenttinel_private TO service_role;
GRANT SELECT ON starcenttinel_private.control_state TO service_role;
GRANT EXECUTE ON FUNCTION public.starcenttinel_security_snapshot() TO service_role;
