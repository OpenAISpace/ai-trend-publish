import {
  createContext,
  useContext,
  type PropsWithChildren,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useStickyState } from "../hooks/use-sticky-state";

export interface Session {
  apiKey: string;
  unlocked: boolean;
}

const defaultSession: Session = {
  apiKey: "",
  unlocked: false,
};

export interface SessionState {
  session: Session;
  setSession: Dispatch<SetStateAction<Session>>;
}

const SessionContext = createContext<SessionState>({
  session: defaultSession,
  setSession: () => {},
});

export function useSessionState(): SessionState {
  const [session, setSession] = useStickyState<Session>(
    "trendfinder.session",
    defaultSession,
  );
  return { session, setSession };
}

export function SessionProvider({
  value,
  children,
}: PropsWithChildren<{ value: SessionState }>) {
  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
