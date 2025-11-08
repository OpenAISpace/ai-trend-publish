import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppSidebar } from "./app-sidebar";

export function AppLayout() {
  const state = useRouterState();
  const navigate = useNavigate();

  useEffect(() => {
    if (state.location.pathname === "/") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [state.location.pathname, navigate]);

  return (
    <div className="flex min-h-screen items-start gap-6 bg-background px-4 py-6 lg:px-10">
      <AppSidebar />
      <main className="flex w-full flex-1 flex-col space-y-6">
        <Outlet />
      </main>
    </div>
  );
}
