import { useMemo } from "react";
import { ApiClient } from "./api";
import { useSession } from "./session";

export function useApiClient() {
  const { session } = useSession();
  return useMemo(() => new ApiClient(session), [session]);
}
