import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkOwner } from "@/lib/owner.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Owner check. Only ever calls the server function when a Supabase session
 * exists — otherwise the request has no bearer token and the auth middleware
 * throws "Unauthorized: No authorization header provided".
 */
export function useOwner() {
  const fn = useServerFn(checkOwner);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setHasSession(!!data.session);
    });
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      setHasSession(!!session);
    });
    return () => {
      active = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  const q = useQuery({
    queryKey: ["owner", "check"],
    queryFn: () => fn({ data: undefined as any }),
    enabled: hasSession === true,
    staleTime: 60_000,
    retry: false,
  });

  return {
    isOwner: !!q.data?.isOwner,
    loading: hasSession === null || q.isLoading,
    userId: q.data?.userId,
  };
}
