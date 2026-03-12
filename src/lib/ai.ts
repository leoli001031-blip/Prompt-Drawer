import { invoke } from "@tauri-apps/api/core";
import type {
  AiProfileDraft,
  AiProviderProfile,
  AiSettingsSnapshot,
  AiTaskInput,
  AiTaskResult,
  AiTaskType
} from "../types/ai";

const AI_STORAGE_KEY = "prompt-workbench:ai:v1";
const AI_REQUEST_TIMEOUT_MS = 65000;

const EMPTY_AI_SETTINGS: AiSettingsSnapshot = {
  default_profile_id: null,
  profiles: []
};

function isTauriAvailable(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function makeId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function parseTemperature(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.7;
  }

  return Math.min(2, Math.max(0, value));
}

function parseMaxTokens(value: string | number | undefined): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : undefined;
  }

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function normalizeProfile(profile: Partial<AiProviderProfile>): AiProviderProfile {
  return {
    id: typeof profile.id === "string" && profile.id.trim() ? profile.id : makeId("profile"),
    name: typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : "未命名模型配置",
    kind: profile.kind === "openai_compatible" ? profile.kind : "openai_compatible",
    base_url: normalizeBaseUrl(profile.base_url ?? "https://api.openai.com/v1"),
    api_key: typeof profile.api_key === "string" ? profile.api_key.trim() : "",
    model: typeof profile.model === "string" ? profile.model.trim() : "",
    temperature: parseTemperature(profile.temperature ?? 0.7),
    max_tokens: parseMaxTokens(profile.max_tokens),
    is_default: Boolean(profile.is_default),
    created_at:
      typeof profile.created_at === "number" && Number.isFinite(profile.created_at)
        ? profile.created_at
        : Date.now(),
    updated_at:
      typeof profile.updated_at === "number" && Number.isFinite(profile.updated_at)
        ? profile.updated_at
        : Date.now()
  };
}

function normalizeSettings(snapshot: AiSettingsSnapshot): AiSettingsSnapshot {
  const profiles = (snapshot.profiles ?? []).map(normalizeProfile);
  const explicitDefault =
    profiles.find((profile) => profile.is_default)?.id ??
    (typeof snapshot.default_profile_id === "string" ? snapshot.default_profile_id : null);
  const defaultId =
    (explicitDefault && profiles.some((profile) => profile.id === explicitDefault) ? explicitDefault : null) ??
    profiles[0]?.id ??
    null;

  return {
    default_profile_id: defaultId,
    profiles: profiles.map((profile) => ({
      ...profile,
      is_default: profile.id === defaultId
    }))
  };
}

function readLocalSettings(): AiSettingsSnapshot {
  const raw = window.localStorage.getItem(AI_STORAGE_KEY);
  if (!raw) {
    return EMPTY_AI_SETTINGS;
  }

  try {
    return normalizeSettings(JSON.parse(raw) as AiSettingsSnapshot);
  } catch {
    return EMPTY_AI_SETTINGS;
  }
}

function writeLocalSettings(snapshot: AiSettingsSnapshot): AiSettingsSnapshot {
  const next = normalizeSettings(snapshot);
  window.localStorage.setItem(AI_STORAGE_KEY, JSON.stringify(next));
  return next;
}

function buildSystemPrompt(taskType: AiTaskType): string {
  switch (taskType) {
    case "rewrite_block":
      return "你是专业提示词编辑助手。请在保留原意的前提下改写目标 Block，让它更清晰、更具体、可直接用于 AI 生成。只输出改写后的正文，不要解释。";
    case "expand_block":
      return "你是专业提示词编辑助手。请扩写目标 Block，让描述更丰富、层次更完整，但不要脱离原意。只输出扩写后的正文，不要解释。";
    case "compress_block":
      return "你是专业提示词编辑助手。请压缩目标 Block，让内容更短、更干净、更适合提示词场景。只输出压缩后的正文，不要解释。";
    case "generate_from_asset":
    default:
      return "你是专业提示词写作助手。请根据给定的资产标题、标签和已有 Block，生成一段更完整、可直接复制使用的提示词。只输出最终提示词正文，不要解释，不要加引号。";
  }
}

function buildUserPrompt(input: AiTaskInput): string {
  const targetBlock =
    input.target_block_id != null
      ? input.blocks.find((block) => block.id === input.target_block_id) ?? null
      : null;

  const blockLines = input.blocks
    .map((block, index) => {
      const label = block.label.trim() || "未命名 Block";
      const content = block.content.trim() || "（空）";
      return `${index + 1}. [${label} / ${block.type}]\n${content}`;
    })
    .join("\n\n");

  return [
    `资产标题：${input.asset_title || "未命名资产"}`,
    `目录类型：${input.folder_type === "project" ? "项目分镜" : "提示词库"}`,
    input.tags.length > 0 ? `标签：${input.tags.join("，")}` : "",
    input.context_remark?.trim() ? `备注：${input.context_remark.trim()}` : "",
    "",
    "当前 Blocks：",
    blockLines || "（没有可用 Block）",
    "",
    targetBlock
      ? `目标 Block：${targetBlock.label.trim() || "未命名 Block"}\n${targetBlock.content.trim() || "（空）"}`
      : "",
    input.user_instruction?.trim() ? `用户补充要求：${input.user_instruction.trim()}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function extractResponseText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }

        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

async function runOpenAiCompatibleTask(profile: AiProviderProfile, input: AiTaskInput): Promise<AiTaskResult> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${normalizeBaseUrl(profile.base_url)}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${profile.api_key}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: profile.model,
        temperature: profile.temperature,
        max_tokens: profile.max_tokens,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(input.task_type)
          },
          {
            role: "user",
            content: buildUserPrompt(input)
          }
        ]
      })
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("AI 请求超时，请检查模型服务或网络连接。");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `AI 请求失败（${response.status}）`);
  }

  const payload = (await response.json()) as {
    model?: string;
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  const text = extractResponseText(payload.choices?.[0]?.message?.content);
  if (!text) {
    throw new Error("模型没有返回可用文本。");
  }

  return {
    text,
    raw_model: payload.model,
    usage: payload.usage
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = AI_REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error("AI 请求超时，请检查模型服务或网络连接。"));
    }, timeoutMs);

    void promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export function createAiProfileDraft(profile?: AiProviderProfile | null): AiProfileDraft {
  return {
    id: profile?.id,
    name: profile?.name ?? "",
    kind: profile?.kind ?? "openai_compatible",
    base_url: profile?.base_url ?? "https://api.openai.com/v1",
    api_key: profile?.api_key ?? "",
    model: profile?.model ?? "",
    temperature: profile?.temperature ?? 0.7,
    max_tokens: profile?.max_tokens != null ? String(profile.max_tokens) : "",
    is_default: profile?.is_default ?? false
  };
}

export function findAiProfile(snapshot: AiSettingsSnapshot, profileId: string | null | undefined): AiProviderProfile | null {
  if (!profileId) {
    return null;
  }

  return snapshot.profiles.find((profile) => profile.id === profileId) ?? null;
}

export function getDefaultAiProfile(snapshot: AiSettingsSnapshot): AiProviderProfile | null {
  return findAiProfile(snapshot, snapshot.default_profile_id);
}

export async function loadAiSettings(): Promise<AiSettingsSnapshot> {
  if (isTauriAvailable()) {
    return normalizeSettings(await invoke<AiSettingsSnapshot>("ai_list_profiles"));
  }

  return readLocalSettings();
}

export async function saveAiProfile(profile: AiProfileDraft): Promise<AiSettingsSnapshot> {
  const normalizedDraft = {
    id: profile.id,
    name: profile.name.trim(),
    kind: profile.kind,
    base_url: normalizeBaseUrl(profile.base_url),
    api_key: profile.api_key.trim(),
    model: profile.model.trim(),
    temperature: Number(profile.temperature),
    max_tokens: parseMaxTokens(profile.max_tokens),
    is_default: profile.is_default
  };

  if (isTauriAvailable()) {
    return normalizeSettings(await invoke<AiSettingsSnapshot>("ai_save_profile", { input: normalizedDraft }));
  }

  const current = readLocalSettings();
  const existing = normalizedDraft.id ? current.profiles.find((item) => item.id === normalizedDraft.id) : null;
  const nextProfile = normalizeProfile({
    ...existing,
    ...normalizedDraft,
    id: normalizedDraft.id ?? existing?.id ?? makeId("profile"),
    created_at: existing?.created_at ?? Date.now(),
    updated_at: Date.now()
  });
  const nextProfiles = existing
    ? current.profiles.map((item) => (item.id === nextProfile.id ? nextProfile : item))
    : [nextProfile, ...current.profiles];

  return writeLocalSettings({
    default_profile_id: nextProfile.is_default ? nextProfile.id : current.default_profile_id,
    profiles: nextProfiles
  });
}

export async function deleteAiProfile(profileId: string): Promise<AiSettingsSnapshot> {
  if (isTauriAvailable()) {
    return normalizeSettings(await invoke<AiSettingsSnapshot>("ai_delete_profile", { profileId }));
  }

  const current = readLocalSettings();
  return writeLocalSettings({
    default_profile_id: current.default_profile_id === profileId ? null : current.default_profile_id,
    profiles: current.profiles.filter((profile) => profile.id !== profileId)
  });
}

export async function testAiProfile(profile: AiProfileDraft): Promise<string> {
  const payload = {
    id: profile.id,
    name: profile.name.trim() || "测试配置",
    kind: profile.kind,
    base_url: normalizeBaseUrl(profile.base_url),
    api_key: profile.api_key.trim(),
    model: profile.model.trim(),
    temperature: parseTemperature(Number(profile.temperature)),
    max_tokens: parseMaxTokens(profile.max_tokens),
    is_default: profile.is_default
  };

  if (isTauriAvailable()) {
    return withTimeout(invoke<string>("ai_test_profile", { input: payload }));
  }

  const result = await runOpenAiCompatibleTask(normalizeProfile(payload), {
    profile_id: payload.id ?? "test_profile",
    task_type: "compress_block",
    folder_type: "library",
    asset_title: "连接测试",
    tags: [],
    blocks: [
      {
        id: "test_block",
        type: "custom",
        label: "",
        content: "请只回复 OK"
      }
    ],
    target_block_id: "test_block",
    user_instruction: "请只回复 OK"
  });

  return result.text;
}

export async function runAiTask(input: AiTaskInput): Promise<AiTaskResult> {
  if (isTauriAvailable()) {
    return withTimeout(invoke<AiTaskResult>("ai_run_task", { input }));
  }

  const settings = readLocalSettings();
  const profile = findAiProfile(settings, input.profile_id);
  if (!profile) {
    throw new Error("未找到对应的 AI 配置。");
  }

  return runOpenAiCompatibleTask(profile, input);
}
