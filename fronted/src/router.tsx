import {
  Outlet,
  RootRoute,
  Route,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "./components/layout/app-layout";
import { UnlockPage } from "./pages/unlock-page";
import { DashboardPage } from "./pages/dashboard-page";
import { WorkflowsPage } from "./pages/workflows-page";
import { ConfigsPage } from "./pages/configs-page";
import { PromptsPage } from "./pages/prompts-page";
import { DataSourcesPage } from "./pages/data-sources-page";
import { LogsPage } from "./pages/logs-page";
import type { SessionState } from "./lib/session";

export type RouterContext = SessionState;

const rootRoute = new RootRoute({
  component: () => <Outlet />,
});

const requireUnlock = ({ context }: { context: RouterContext }) => {
  if (!context.session.unlocked) {
    throw redirect({ to: "/unlock" });
  }
};

const unlockRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/unlock",
  component: UnlockPage,
});

const appRoute = new Route({
  getParentRoute: () => rootRoute,
  path: "/",
  component: AppLayout,
  beforeLoad: requireUnlock,
});

const dashboardAliasRoute = new Route({
  getParentRoute: () => appRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const workflowsRoute = new Route({
  getParentRoute: () => appRoute,
  path: "/workflows",
  component: WorkflowsPage,
});

const configsRoute = new Route({
  getParentRoute: () => appRoute,
  path: "/configs",
  component: ConfigsPage,
});

const promptsRoute = new Route({
  getParentRoute: () => appRoute,
  path: "/prompts",
  component: PromptsPage,
});

const dataSourcesRoute = new Route({
  getParentRoute: () => appRoute,
  path: "/data-sources",
  component: DataSourcesPage,
});

const logsRoute = new Route({
  getParentRoute: () => appRoute,
  path: "/logs",
  component: LogsPage,
});

const routeTree = rootRoute.addChildren([
  unlockRoute,
  appRoute.addChildren([
    dashboardAliasRoute,
    workflowsRoute,
    configsRoute,
    promptsRoute,
    dataSourcesRoute,
    logsRoute,
  ]),
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  context: null as unknown as RouterContext,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
