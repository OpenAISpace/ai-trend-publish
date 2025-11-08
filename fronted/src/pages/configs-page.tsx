import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Spinner } from "../components/ui/spinner";
import { useToast } from "../components/ui/toast";
import { useSession } from "../lib/session";
import { useApiClient } from "../lib/use-api-client";
import { queryKeys } from "../lib/query-keys";
import type { ConfigItem } from "../types";

interface ConfigField {
  key: string;
  label: string;
  readOnly?: boolean;
  placeholder?: string;
  helper?: string;
}

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  fields: ConfigField[];
}

const SECTIONS: ConfigSection[] = [
  {
    id: "security",
    title: "系统接入",
    description: "控制台解锁依赖 Server API Key，仅展示用于校验的口令。",
    fields: [
      {
        key: "SERVER_API_KEY",
        label: "Server API Key（只读）",
        readOnly: true,
        helper: "该值存储在服务器环境变量中，仅用于前端解锁。",
      },
    ],
  },
  {
    id: "model",
    title: "大模型与提示词",
    description: "配置用于摘要与排序的主力大模型供应商。",
    fields: [
      {
        key: "AI_SUMMARIZER_LLM_PROVIDER",
        label: "摘要模型（示例：DEEPSEEK:deepseek-chat）",
        placeholder: "DEEPSEEK:deepseek-chat",
      },
    ],
  },
  {
    id: "crawler",
    title: "采集凭证",
    description: "Firecrawl / Twitter 等数据源的抓取密钥。",
    fields: [
      {
        key: "FIRE_CRAWL_API_KEY",
        label: "Firecrawl API Key",
        placeholder: "fc_live_xxx",
      },
      {
        key: "X_API_BEARER_TOKEN",
        label: "Twitter Bearer Token",
        placeholder: "AAAAAAAA...",
      },
    ],
  },
  {
    id: "wechat",
    title: "公众号发布",
    description: "用于推送内容的微信公众号参数。",
    fields: [
      { key: "WEIXIN_APP_ID", label: "App ID" },
      { key: "WEIXIN_APP_SECRET", label: "App Secret" },
      { key: "AUTHOR", label: "作者署名" },
    ],
  },
];

export function ConfigsPage() {
  const { session } = useSession();
  const api = useApiClient();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.configs(session),
    queryFn: () => api.fetchConfigs(),
    enabled: session.unlocked,
  });

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    (data ?? []).forEach((item: ConfigItem) => {
      next[item.key] = item.value ?? "";
    });
    setForm(next);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async ({
      fields,
      sectionId,
    }: {
      fields: ConfigField[];
      sectionId: string;
    }) => {
      await Promise.all(
        fields.map((field) => {
          if (field.readOnly) return Promise.resolve();
          return api.updateConfig({
            key: field.key,
            value: form[field.key] ?? "",
            description: field.label,
            scope: "db",
            category: sectionId,
          });
        }),
      );
    },
    onSuccess: () => {
      pushToast({ title: "配置已保存", variant: "success" });
      queryClient.invalidateQueries({ queryKey: queryKeys.configs(session) });
    },
    onError: (error: unknown) => {
      pushToast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "error",
      });
    },
  });

  const handleSave = (section: ConfigSection) => {
    mutation.mutate({ fields: section.fields, sectionId: section.id });
  };

  return (
    <>
      <AppHeader
        title="配置中心"
        subtitle="保留最小可运行配置：模型、采集与公众号三大模块"
      />
      <AnimatedPage>
        <div className="grid gap-6">
          {SECTIONS.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  {section.title}
                </p>
                <CardTitle className="text-xl">{section.description}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading && (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner />
                    加载配置中...
                  </p>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <label className="text-xs uppercase tracking-widest text-muted-foreground">
                        {field.label}
                      </label>
                      <Input
                        value={form[field.key] ?? ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        placeholder={field.placeholder}
                        disabled={field.readOnly}
                        readOnly={field.readOnly}
                      />
                      {field.helper && (
                        <p className="text-xs text-muted-foreground/80">
                          {field.helper}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => handleSave(section)}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Spinner className="mr-2 h-4 w-4" />
                  )}
                  {mutation.isPending ? "保存中..." : "保存该分组"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </AnimatedPage>
    </>
  );
}
