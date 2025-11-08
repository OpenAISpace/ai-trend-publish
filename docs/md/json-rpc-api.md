# 工作流 REST API 指南

## 功能概述

此 API 提供了手动触发指定工作流的能力，可在需要时即时执行而无需等待定时任务。

## 接口信息

- **接口地址**: `POST /api/workflows/:workflowId/trigger`
- **Content-Type**: `application/json`
- **Authorization**: Bearer Token

## 认证方式

API 使用 Bearer Token 认证机制。需要在请求头中添加 `Authorization` 字段：

```
Authorization: Bearer your-api-key
```

其中 `your-api-key` 需要替换为实际的 API 密钥，该密钥可通过 `SERVER_API_KEY` 环境变量配置。

## 快速开始

```bash
curl -X POST http://localhost:8000/api/workflows/weixin-article-workflow/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "payload": {
      "forcePublish": true
    },
    "trigger": "api"
  }'
```

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| `workflowId` | Path | string | 是 | 工作流标识，例如 `weixin-article-workflow` |
| `payload` | Body | object | 否 | 触发时传入的自定义参数，默认为 `{}` |
| `trigger` | Body | `"cron" \| "api" \| "manual"` | 否 | 触发来源，默认 `manual` |

### 支持的工作流

| 工作流类型 | 说明 |
|-----------|------|
| `weixin-article-workflow` | 微信文章工作流 |
| `weixin-aibench-workflow` | AI Bench 工作流 |
| `weixin-hellogithub-workflow` | HelloGitHub 工作流 |

### 响应示例

成功响应：
```json
{
  "runId": "run-20241108-001"
}
```

认证失败：
```json
{
  "error": {
    "code": -32001,
    "message": "未授权的访问"
  }
}
```

无效工作流：
```json
{
  "error": {
    "code": -32602,
    "message": "无效的工作流"
  }
}
```

## 错误代码

| 错误代码 | 说明 | 解决方案 |
|---------|------|---------|
| -32001 | 未授权访问 | 检查 `Authorization` 头部是否正确 |
| -32602 | 无效的工作流或参数 | 确认 `workflowId` 与数据格式 |
| -32603 | 服务器内部错误 | 查看服务日志获取更多信息 |





## 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# API 鉴权配置
SERVER_API_KEY=your-api-key  # 替换为您的实际API密钥
```

## 更多信息

完整的JSON-RPC协议规范请参考：[JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) 
