# 工作流手动触发 API

## 功能概述

此 API 提供了手动触发工作流的能力，可以在需要时立即执行指定类型的工作流，而不需要等待定时任务。

## 接口信息

- **接口地址**: `http://localhost:8000/api/workflow`
- **请求方式**: POST
- **数据格式**: JSON-RPC 2.0
- **Content-Type**: `application/json`
- **Authorization**: Bearer Token

## 认证方式

API 使用 Bearer Token 认证机制。需要在请求头中添加 `Authorization` 字段：

```
Authorization: Bearer your-api-key
```

其中 `your-api-key` 需要替换为实际的 API 密钥。API 密钥可以在环境变量 `SERVER_API_KEY` 中配置。

## 快速开始

### 基本调用示例

```bash
curl -X POST http://localhost:8000/api/workflow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "jsonrpc": "2.0",
    "method": "triggerWorkflow",
    "params": {
      "workflowType": "weixin-article-workflow"
    },
    "id": 1
  }'
```

### 请求参数说明

```json
{
    "jsonrpc": "2.0",           // JSON-RPC 协议版本，固定为 "2.0"
    "method": "triggerWorkflow", // 方法名，固定为 "triggerWorkflow"
    "params": {
      "workflowType": "weixin-article-workflow"  // 要触发的工作流类型
    },
    "id": 1                     // 请求标识，可以是数字或字符串
}
```

### 支持的工作流类型

| 工作流类型 | 说明 | 执行内容 |
|-----------|------|---------|
| `weixin-article-workflow` | 微信文章工作流 | 抓取并发布最新的AI相关文章 |
| `weixin-aibench-workflow` | AI Bench工作流 | 生成并发布AI模型评测报告 |
| `weixin-hellogithub-workflow` | HelloGithub工作流 | 推送优质GitHub项目推荐 |

### 响应示例

成功响应：
```json
{
    "jsonrpc": "2.0",
    "result": {
        "success": true,
        "message": "工作流 weixin-article-workflow 已成功触发"
    },
    "id": 1
}
```

认证失败响应：
```json
{
    "jsonrpc": "2.0",
    "error": {
        "code": -32001,
        "message": "未授权的访问",
        "data": {
            "error": "缺少有效的 Authorization 请求头"
        }
    }
}
```

无效工作流类型响应：
```json
{
    "jsonrpc": "2.0",
    "error": {
        "code": -32602,
        "message": "无效的工作流类型",
        "data": {
            "availableWorkflows": [
                "weixin-article-workflow",
                "weixin-aibench-workflow",
                "weixin-hellogithub-workflow"
            ]
        }
    },
    "id": 1
}
```

## 错误处理

| 错误代码 | 说明 | 解决方案 |
|---------|------|---------|
| -32001 | 未授权的访问 | 检查 Authorization 请求头是否正确设置 |
| -32600 | 无效的请求 | 检查请求格式是否符合JSON-RPC 2.0规范 |
| -32601 | 方法不存在 | 确认method是否为"triggerWorkflow" |
| -32602 | 无效的参数 | 检查workflowType是否为支持的类型 |
| -32603 | 内部错误 | 查看服务器日志了解具体错误原因 |





## 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# API 鉴权配置
SERVER_API_KEY=your-api-key  # 替换为您的实际API密钥
```

## 更多信息

完整的JSON-RPC协议规范请参考：[JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification) 