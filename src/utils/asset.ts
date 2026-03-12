import { getBlockTypeLabel } from "../lib/payload";
import type { PromptAsset } from "../types/storage";

export function cloneAsset(asset: PromptAsset): PromptAsset {
  return JSON.parse(JSON.stringify(asset)) as PromptAsset;
}

export function splitTags(value: string): string[] {
  return value
    .split(/[,\n，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function assetFingerprint(asset: PromptAsset | null): string {
  return asset ? JSON.stringify(asset) : "";
}

export function matchesAssetQuery(asset: PromptAsset, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    asset.title,
    asset.payload.remark ?? "",
    asset.payload.tags.join(" "),
    asset.payload.blocks.map((block) => block.content).join(" "),
    asset.payload.blocks.map((block) => block.label ?? "").join(" "),
    asset.payload.blocks.map((block) => getBlockTypeLabel(block.type)).join(" ")
  ]
    .join("\n")
    .toLowerCase();

  return haystack.includes(normalized);
}
