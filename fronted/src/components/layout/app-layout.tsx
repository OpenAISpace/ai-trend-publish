import { Outlet } from "@tanstack/react-router";
import { AppSidebar } from "./app-sidebar";

export function AppLayout() {
  return (
    <div className="flex min-h-screen gap-6 bg-background px-4 py-6 lg:px-10">
      <AppSidebar />
      <main className="flex w-full flex-1 flex-col space-y-6">
        <Outlet />
      </main>
    </div>
  );
}
