import { Button } from "../ui/button";
import { useSession } from "../../lib/session";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { session, setSession } = useSession();

  const handleLock = () => {
    setSession((prev) => ({ ...prev, unlocked: false }));
  };

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-3xl border border-white/5 p-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
          TREND - SECURED
        </p>
        <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={handleLock}>
        Lock Console
      </Button>
    </div>
  );
}
