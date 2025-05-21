import { FeishuNotifier } from "../feishu.notify.ts";
import { ConfigManager } from "@src/utils/config/config-manager.ts";
import { Logger } from "@zilla/logger";
import { assertEquals, assertRejects } from "@std/assert";
import { stub, spy } from "@std/testing/mock"; // Deno's standard library for mocking
import axios from "npm:axios"; // Assuming axios is used for HTTP requests

const logger = new Logger("test-feishu-notify");

// Helper to mock ConfigManager
const mockConfig = async (enabled: boolean, webhookUrl?: string) => {
  const configManager = ConfigManager.getInstance();
  // Ensure default sources are initialized if your ConfigManager relies on it
  // Or mock specific get calls if that's cleaner
  await configManager.initDefaultConfigSources(); // This might still read actual env/files

  // More robust mocking: directly stub the get method
  const getStub = stub(configManager, "get", (key: string) => {
    if (key === "ENABLE_FEISHU") {
      return Promise.resolve(enabled);
    }
    if (key === "FEISHU_WEBHOOK_URL") {
      return Promise.resolve(webhookUrl);
    }
    return Promise.resolve(undefined); // Default for other keys
  });
  return getStub;
};

Deno.test("FeishuNotifier - Test Initialization and Refresh", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  await notifier.refresh(); // Ensure refresh completes
  // Basic assertion: check if notifier seems enabled (internal state might not be directly testable without exposing it)
  // We'll infer state from behavior in other tests.
  logger.info("FeishuNotifier initialized for testing.");
  configGetStub.restore(); // Clean up stub
});

Deno.test("FeishuNotifier - Send Text Notification Successfully", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();

  const axiosPostSpy = spy(axios, "post");

  try {
    // Mock a successful Feishu API response
    axiosPostSpy.and.callFake(() => Promise.resolve({ status: 200, data: { code: 0, msg: "success" } }));

    const result = await notifier.notify("Test Title", "Test content from FeishuNotifier.");
    assertEquals(result, true);
    assertEquals(axiosPostSpy.calls.length, 1);
    const [url, payload, options] = axiosPostSpy.calls[0].args;
    assertEquals(url, "https://feishu.example.com/webhook");
    assertEquals(payload.msg_type, "text");
    assertEquals(payload.content.text, "Test Title\nTest content from FeishuNotifier.");
    assertEquals(options.headers["Content-Type"], "application/json; charset=utf-8");
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});

Deno.test("FeishuNotifier - Send Success Notification", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    axiosPostSpy.and.callFake(() => Promise.resolve({ status: 200, data: { code: 0 } }));
    const result = await notifier.success("Operation Successful", "Data processed.");
    assertEquals(result, true);
    assertEquals(axiosPostSpy.calls[0].args[1].content.text, "Operation Successful\n✅ Data processed.");
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});

Deno.test("FeishuNotifier - Send Error Notification", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    axiosPostSpy.and.callFake(() => Promise.resolve({ status: 200, data: { code: 0 } }));
    const result = await notifier.error("System Alert", "Server unreachable.");
    assertEquals(result, true);
    assertEquals(axiosPostSpy.calls[0].args[1].content.text, "System Alert\n❌ Server unreachable.");
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});


Deno.test("FeishuNotifier - Attempt to send when Feishu is disabled", async () => {
  const configGetStub = await mockConfig(false, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    const result = await notifier.notify("Disabled Test", "This should not send.");
    assertEquals(result, false);
    assertEquals(axiosPostSpy.calls.length, 0); // Axios should not be called
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});

Deno.test("FeishuNotifier - Attempt to send when webhook URL is not configured", async () => {
  const configGetStub = await mockConfig(true, undefined); // Enabled, but no URL
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    const result = await notifier.notify("No URL Test", "This should not send.");
    assertEquals(result, false);
    assertEquals(axiosPostSpy.calls.length, 0);
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});

Deno.test("FeishuNotifier - Handle Feishu API error response", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    // Mock a Feishu API error response
    axiosPostSpy.and.callFake(() => Promise.resolve({ status: 200, data: { code: 19001, msg: "App ticket is invalid" } }));
    const result = await notifier.notify("API Error Test", "Testing API error handling.");
    assertEquals(result, false);
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});

Deno.test("FeishuNotifier - Handle network error during send", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    // Mock a network error
    axiosPostSpy.and.callFake(() => Promise.reject(new Error("Network connection failed")));
    const result = await notifier.notify("Network Error Test", "Testing network error handling.");
    assertEquals(result, false);
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});

// Add similar tests for warning() and info() methods for completeness
Deno.test("FeishuNotifier - Send Warning Notification", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    axiosPostSpy.and.callFake(() => Promise.resolve({ status: 200, data: { code: 0 } }));
    const result = await notifier.warning("System Warning", "Disk space low.");
    assertEquals(result, true);
    assertEquals(axiosPostSpy.calls[0].args[1].content.text, "System Warning\n⚠️ Disk space low.");
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});

Deno.test("FeishuNotifier - Send Info Notification", async () => {
  const configGetStub = await mockConfig(true, "https://feishu.example.com/webhook");
  const notifier = new FeishuNotifier();
  const axiosPostSpy = spy(axios, "post");

  try {
    axiosPostSpy.and.callFake(() => Promise.resolve({ status: 200, data: { code: 0 } }));
    const result = await notifier.info("Information Update", "Scheduled maintenance tonight.");
    assertEquals(result, true);
    assertEquals(axiosPostSpy.calls[0].args[1].content.text, "Information Update\nℹ️ Scheduled maintenance tonight.");
  } finally {
    axiosPostSpy.restore();
    configGetStub.restore();
  }
});
