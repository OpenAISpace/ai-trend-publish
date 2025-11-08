import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, Rows3, Waves, Lock, FileText, Database } from "lucide-react";
import { cn } from "../../lib/cn";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: Activity },
  { to: "/workflows", label: "Workflows", icon: Rows3 },
  { to: "/prompts", label: "Prompts", icon: FileText },
  { to: "/data-sources", label: "Data Sources", icon: Database },
  { to: "/logs", label: "Logs", icon: Waves },
];

export function AppSidebar() {
  const state = useRouterState();

  return (
    <aside className="glass-panel hidden w-64 flex-col justify-between lg:flex">
      <div className="p-6 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            TREND FINDER
          </p>
          <h2 className="mt-3 text-2xl font-semibold">Control Center</h2>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/"
                ? state.location.pathname === "/" ||
                  state.location.pathname.startsWith("/dashboard")
                : state.location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-2 text-sm transition",
                  active
                    ? "border-white/20 bg-white/10 text-foreground"
                    : "text-muted-foreground hover:border-white/10 hover:text-foreground"
                )}
              >
                <Icon
                  size={16}
                  className={
                    active ? "text-foreground" : "text-muted-foreground"
                  }
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-white/5 p-6">
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 px-4 py-3 text-xs uppercase tracking-widest text-muted-foreground">
          <Lock size={14} />
          <span>Secure Access Enabled</span>
        </div>
      </div>
    </aside>
  );
}
