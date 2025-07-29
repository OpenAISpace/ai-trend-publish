import { TextLogoGenerator } from "../providers/image-gen/text-logo";
import path from "path";

async function testTextLogo() {
  try {
    // 蓝色渐变主题
    await TextLogoGenerator.saveToFile(
      {
        text: "大模型榜�?,
        width: 1200,
        height: 400,
        fontSize: 160,
        backgroundColor: "#ffffff",
        gradientStart: "#1a73e8",
        gradientEnd: "#4285f4",
      },
      path.join(__dirname, "../../output/logo-blue.png"),
    );

    // 深紫色渐变主�?
    await TextLogoGenerator.saveToFile(
      {
        text: "大模型榜�?,
        width: 1200,
        height: 400,
        fontSize: 160,
        backgroundColor: "#ffffff",
        gradientStart: "#6200ea",
        gradientEnd: "#9d46ff",
      },
      path.join(__dirname, "../../output/logo-purple.png"),
    );

    // 科技蓝主�?
    await TextLogoGenerator.saveToFile(
      {
        text: "大模型榜�?,
        width: 1200,
        height: 400,
        fontSize: 160,
        backgroundColor: "#f8f9fa",
        gradientStart: "#0277bd",
        gradientEnd: "#039be5",
      },
      path.join(__dirname, "../../output/logo-tech.png"),
    );

    console.log("Logo生成成功！请查看 output/ 目录下的三个不同主题的logo文件");
  } catch (error) {
    console.error("Logo生成失败:", error);
  }
}

// 运行测试
testTextLogo();
