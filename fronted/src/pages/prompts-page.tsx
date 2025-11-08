import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import { Button } from "../components/ui/button";
import { useSession } from "../lib/session";
import { queryKeys } from "../lib/query-keys";
import { useApiClient } from "../lib/use-api-client";
import type { PromptDetail } from "../types";

const PROMPT_ORDER = [
  {
    id: "polish",
    title: "润色提示词",
    description: "用于优化语言表达、统一语气风格。",
  },
  {
    id: "ranker",
    title: "排序提示词",
    description: "用于按评分维度筛选和排序素材。",
  },
];

export function PromptsPage() {
  const { session } = useSession();
  const api = useApiClient();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.prompts(session),
    queryFn: () => api.fetchPrompts(),
    enabled: session.unlocked,
  });

  const dataMap = useMemo(() => {
    const map = new Map<string, PromptDetail>();
    (data ?? []).forEach((item) => map.set(item.id, item));
    return map;
  }, [data]);

  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts({});
  }, [data]);

  const handleChange = (id: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const mutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      await api.updatePrompt(id, content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts(session) });
    },
  });

  return (
    <>
      <AppHeader title="提示词管理" subtitle="维护润色与排序所用提示词" />
      <AnimatedPage>
        <div className="grid gap-6 lg:grid-cols-2">
          {PROMPT_ORDER.map((preset) => {
            const prompt = dataMap.get(preset.id);
            const value =
              drafts[preset.id] ??
              prompt?.content ??
              (isLoading ? "加载中..." : "");
            return (
              <Card key={preset.id}>
                <CardHeader>
                  <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                    {preset.title}
                  </p>
                  <CardTitle className="text-xl">{preset.description}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!prompt && isLoading && (
                    <p className="text-sm text-muted-foreground">加载中...</p>
                  )}
                  <Textarea
                    rows={14}
                    value={value}
                    onChange={(e) => handleChange(preset.id, e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={() =>
                        mutation.mutate({
                          id: preset.id,
                          content: value,
                        })
                      }
                      disabled={mutation.isPending}
                    >
                      {mutation.isPending ? "保存中..." : "保存提示词"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setDrafts((prev) => ({
                          ...prev,
                          [preset.id]: prompt?.content ?? "",
                        }))
                      }
                    >
                      重置
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </AnimatedPage>
    </>
  );
}
