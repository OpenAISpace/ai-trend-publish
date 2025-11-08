import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useSession } from "../lib/session";
import { useApiClient } from "../lib/use-api-client";
import { queryKeys } from "../lib/query-keys";
import type { ConfigItem } from "../types";

interface ConfigField {
  key: string;
  label: string;
  readOnly?: boolean;
  placeholder?: string;
}

interface ConfigSection {
  id: string;
  title: string;
  description: string;
  fields: ConfigField[];
}

const SECTIONS: ConfigSection[] = [
  {
    id: "core",
    title: "基础服务",
    description: "控制台鉴权与默认大模型配置。",
    fields: [
      {
        key: "SERVER_API_KEY",
        label: "Server API Key（只读）",
        readOnly: true,
      },
      {
        key: "DEFAULT_LLM_PROVIDER",
        label: "默认大模型（如 DEEPSEEK:deepseek-chat）",
      },
    ],
  },
  {
    id: "crawler",
    title: "采集配置",
    description: "Firecrawl 与 Twitter 抓取凭证。",
    fields: [
      { key: "FIRE_CRAWL_API_KEY", label: "Firecrawl API Key" },
      { key: "X_API_BEARER_TOKEN", label: "Twitter Bearer Token" },
    ],
  },
  {
    id: "wechat",
    title: "微信公众号",
    description: "用于发布推文的公众号信息。",
    fields: [
      { key: "WEIXIN_APP_ID", label: "App ID" },
      { key: "WEIXIN_APP_SECRET", label: "App Secret" },
      { key: "AUTHOR", label: "文章作者署名" },
    ],
  },
  {
    id: "workflow",
    title: "工作流默认",
    description: "设置工作日触发的工作流类型。",
    fields: [
      { key: "1_of_week_workflow", label: "周一工作流" },
      { key: "2_of_week_workflow", label: "周二工作流" },
      { key: "3_of_week_workflow", label: "周三工作流" },
    ],
  },
];

export function ConfigsPage() {
  const { session } = useSession();
  const api = useApiClient();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.configs(session),
    queryFn: () => api.fetchConfigs(),
    enabled: session.unlocked,
  });

  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    const next: Record<string, string> = {};
    (data ?? []).forEach((item) => {
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
        fields.map((field) =>
          api.updateConfig({
            key: field.key,
            value: form[field.key] ?? "",
            description: field.label,
            scope: "db",
            category: sectionId,
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.configs(session) });
    },
  });

  const handleSave = (section: ConfigSection) => {
    mutation.mutate({ fields: section.fields, sectionId: section.id });
  };

  return (
    <>
      <AppHeader
        title="配置中心"
        subtitle="仅保留最小化运行所需的关键配置。"
      />
      <AnimatedPage>
        <div className="grid gap-6">
          {SECTIONS.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                  {section.title}
                </p>
                <CardTitle className="text-xl">{section.description}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading && (
                  <p className="text-sm text-muted-foreground">加载配置中...</p>
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
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => handleSave(section)}
                  disabled={mutation.isPending}
                >
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
