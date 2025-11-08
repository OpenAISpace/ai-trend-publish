import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { AnimatedPage } from "../components/animated-page";
import { useSession } from "../lib/session";

export function UnlockPage() {
  const navigate = useNavigate();
  const { session, setSession } = useSession();
  const [form, setForm] = useState({
    apiKey: session.apiKey || "",
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.apiKey) return;
    setSession({
      apiKey: form.apiKey.trim(),
      unlocked: true,
    });
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <AnimatedPage className="w-full max-w-lg">
        <Card className="glass-panel border-white/10">
          <CardHeader>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              ACCESS REQUIRED
            </p>
            <CardTitle className="text-3xl font-semibold text-foreground">
              Unlock TrendFinder
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Provide the Server API key to unlock workflow management features.
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="apiKey">Server API Key</Label>
                <Input
                  id="apiKey"
                  placeholder="Bearer token"
                  value={form.apiKey}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, apiKey: e.target.value }))
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Enter Console
              </Button>
            </form>
          </CardContent>
        </Card>
      </AnimatedPage>
    </div>
  );
}
