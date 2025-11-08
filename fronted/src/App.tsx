import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { queryClient } from "./lib/query-client";
import { SessionProvider, useSessionState } from "./lib/session";
import { ToastProvider } from "./components/ui/toast";

function Providers() {
  const sessionState = useSessionState();

  return (
    <ToastProvider>
      <SessionProvider value={sessionState}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} context={sessionState} />
        </QueryClientProvider>
      </SessionProvider>
    </ToastProvider>
  );
}

export default function App() {
  return <Providers />;
}
