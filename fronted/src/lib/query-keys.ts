import type { Session } from "./session";

const sessionKey = (session: Session) =>
  `${session.apiKey}|${session.unlocked}`;

export const queryKeys = {
  dashboard: (session: Session) => ["dashboard", sessionKey(session)],
  workflows: (session: Session) => ["workflows", sessionKey(session)],
  configs: (session: Session) => ["configs", sessionKey(session)],
  runs: (session: Session) => ["runs", sessionKey(session)],
  results: (session: Session) => ["results", sessionKey(session)],
  prompts: (session: Session) => ["prompts", sessionKey(session)],
  dataSources: (session: Session) => ["dataSources", sessionKey(session)],
};
