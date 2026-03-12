import type { AiTaskType } from "../types/ai";
import type { FolderType } from "../types/storage";

export function formatFolderType(type: FolderType): string {
  return type === "library" ? "提示词库" : "项目分镜";
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function formatAiTaskLabel(taskType: AiTaskType): string {
  switch (taskType) {
    case "rewrite_block":
      return "改写当前 Block";
    case "expand_block":
      return "扩写当前 Block";
    case "compress_block":
      return "压缩当前 Block";
    case "generate_from_asset":
    default:
      return "生成完整提示词";
  }
}
