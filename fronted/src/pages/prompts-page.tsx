import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { Spinner } from "../components/ui/spinner";
import { useToast } from "../components/ui/toast";
import { useSession } from "../lib/session";
import { queryKeys } from "../lib/query-keys";
import { useApiClient } from "../lib/use-api-client";
import type { PromptDetail } from "../types";

const PROMPT_ORDER = ["polish", "ranker"];

export function PromptsPage() {
  const { session } = useSession();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.prompts(session),
    queryFn: () => api.fetchPrompts(),
    enabled: session.unlocked,
  });

  const orderedPrompts = useMemo(() => {
    if (!data) return [];
    return [...data].sort(
      (a, b) => PROMPT_ORDER.indexOf(a.id) - PROMPT_ORDER.indexOf(b.id),
    );
  }, [data]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    (data ?? []).forEach((prompt) => {
      next[prompt.id] = prompt.content;
    });
    setDrafts(next);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await api.updatePrompt(id, content);
    },
    onSuccess: () => {
      pushToast({ title: "提示词已保存", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts(session) });
    },
    onError: (error: unknown) => {
      pushToast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后再试",
        variant: "error",
      });
    },
  });

  return (
    <>
      <AppHeader
        title="提示词管理"
        subtitle="润色提示词 / 排序提示词在此统一维护"
      />
      <AnimatedPage>
        <div className="grid gap-6 lg:grid-cols-2">
          {orderedPrompts.map((prompt: PromptDetail) => {
            const value =
              drafts[prompt.id] ??
              prompt.content ??
              (isLoading ? "加载中..." : "");
            return (
              <Card key={prompt.id}>
                <CardHeader>
                  <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                    {prompt.title}
                  </p>
                  <CardTitle className="text-xl">
                    {prompt.description}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading && !prompt.content && (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner />
                      加载提示词...
                    </p>
                  )}
                  <Textarea
                    rows={14}
                    value={value}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [prompt.id]: e.target.value,
                      }))
                    }
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() =>
                        mutation.mutate({
                          id: prompt.id,
                          content: value,
                        })
                      }
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending && (
                        <Spinner className="mr-2 h-4 w-4" />
                      )}
                      {mutation.isPending ? "保存中..." : "保存提示词"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDrafts((prev) => ({
                          ...prev,
                          [prompt.id]: prompt.content ?? "",
                        }))
                      }
                    >
                      恢复默认
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    最近更新：{formatDate(prompt.updatedAt)} ·{" "}
                    {prompt.size} 字符
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </AnimatedPage>
    </>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}
