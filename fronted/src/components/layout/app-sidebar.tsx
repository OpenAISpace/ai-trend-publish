import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  Rows3,
  Waves,
  Lock,
  FileText,
  Database,
  Settings2,
} from "lucide-react";
import { cn } from "../../lib/cn";

const navItems = [
  { to: "/dashboard", label: "趋势总览", icon: Activity },
  { to: "/workflows", label: "工作流调度", icon: Rows3 },
  { to: "/configs", label: "配置中心", icon: Settings2 },
  { to: "/prompts", label: "提示词管理", icon: FileText },
  { to: "/data-sources", label: "数据源接入", icon: Database },
  { to: "/logs", label: "运行日志", icon: Waves },
];

export function AppSidebar() {
  const state = useRouterState();

  return (
    <aside className="glass-panel sticky top-6 hidden w-64 max-h-[calc(100vh-48px)] flex-col justify-between overflow-hidden lg:flex">
      <div className="p-6 space-y-8 overflow-y-auto">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            TREND FINDER
          </p>
          <h2 className="mt-3 text-2xl font-semibold">趋势控制台</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            管理采集、调度与发布的全链路。
          </p>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const pathname = state.location.pathname;
            const active = item.to === "/dashboard"
              ? pathname === "/" || pathname.startsWith("/dashboard")
              : pathname.startsWith(item.to);
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
        <div className="flex items-center gap-3 rounded-2xl border border-white/5 px-4 py-3 text-xs text-muted-foreground">
          <Lock size={14} />
          <div>
            <p className="text-xs font-semibold text-foreground">
              安全校验开启
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              需 Server API Key 解锁
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
