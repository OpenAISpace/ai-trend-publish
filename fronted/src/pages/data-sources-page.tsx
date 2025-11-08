import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatedPage } from "../components/animated-page";
import { AppHeader } from "../components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { useSession } from "../lib/session";
import { queryKeys } from "../lib/query-keys";
import { useApiClient } from "../lib/use-api-client";
import type { DataSourceRecord } from "../types";

interface FormState {
  id?: number;
  platform: string;
  identifier: string;
}

const emptyForm: FormState = {
  platform: "",
  identifier: "",
};

export function DataSourcesPage() {
  const { session } = useSession();
  const api = useApiClient();
  const queryClient = useQueryClient();

  const { data: dataSources, isLoading } = useQuery({
    queryKey: queryKeys.dataSources(session),
    queryFn: () => api.fetchDataSources(),
    enabled: session.unlocked,
  });

  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!form.id && dataSources?.length === 0) {
      setForm({ ...emptyForm });
    }
  }, [dataSources, form.id]);

  const createMutation = useMutation({
    mutationFn: () =>
      api.createDataSource({
        platform: form.platform,
        identifier: form.identifier,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dataSources(session) });
      setForm({ ...emptyForm });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!form.id) return Promise.resolve();
      return api.updateDataSource(form.id, {
        platform: form.platform,
        identifier: form.identifier,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dataSources(session) });
      setForm({ ...emptyForm });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteDataSource(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dataSources(session) });
      setForm({ ...emptyForm });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.id) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <>
      <AppHeader title="数据源管理" subtitle="维护 Firecrawl / Twitter 抓取来源" />
      <AnimatedPage>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                数据源列表
              </p>
              <CardTitle className="text-xl">已注册的抓取任务</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[480px] scroll-area pr-2">
              {isLoading && (
                <p className="text-sm text-muted-foreground">加载中...</p>
              )}
              {dataSources?.map((source: DataSourceRecord) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {source.platform === "firecrawl"
                        ? "Firecrawl"
                        : source.platform === "twitter"
                        ? "Twitter"
                        : "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {source.identifier ?? "-"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setForm({
                          id: source.id,
                          platform: source.platform ?? "",
                          identifier: source.identifier ?? "",
                        })
                      }
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(Number(source.id))}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
              {!dataSources?.length && !isLoading && (
                <p className="text-sm text-muted-foreground">暂未配置数据源。</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
                编辑
              </p>
              <CardTitle className="text-xl">
                {form.id ? "更新数据源" : "新增数据源"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    平台类型
                  </label>
                  <Select
                    className="select-muted rounded-2xl border border-white/10 px-4 py-2 text-sm"
                    value={form.platform}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, platform: e.target.value }))
                    }
                    required
                  >
                    <option value="">请选择</option>
                    <option value="firecrawl">Firecrawl</option>
                    <option value="twitter">Twitter</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-muted-foreground">
                    标识/任务名称
                  </label>
                  <Input
                    value={form.identifier}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, identifier: e.target.value }))
                    }
                    placeholder="例如 wechat|twitter 列表 ID"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {form.id
                      ? updateMutation.isPending
                        ? "保存中..."
                        : "保存变更"
                      : createMutation.isPending
                      ? "创建中..."
                      : "创建数据源"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setForm({ ...emptyForm })}
                  >
                    重置
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </AnimatedPage>
    </>
  );
}
