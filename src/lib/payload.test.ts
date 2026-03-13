import { describe, expect, it } from "vitest";
import {
  applyProjectLockedBlocksToPayload,
  appendVersion,
  buildExportPreview,
  buildProjectScript,
  createDefaultPayload,
  createVersionSnapshot,
  parseImportedAssets,
  parsePromptPayload,
  reorderBlocks,
  restoreFromVersion,
  stripProjectLockMetadata,
  syncProjectLockedBlocks,
  toggleProjectLock
} from "./payload";
import type { PromptPayload } from "../types/prompt";
import type { PromptAsset } from "../types/storage";

describe("payload helpers", () => {
  it("parses payload json safely", () => {
    const payload = parsePromptPayload(
      JSON.stringify({
        blocks: [
          { id: "b1", type: "character", content: "hero", isActive: true }
        ],
        tags: ["tag-a"],
        export_settings: {
          separator: "\n",
          include_labels: true
        }
      })
    );

    expect(payload.blocks).toHaveLength(1);
    expect(payload.tags[0]).toBe("tag-a");
  });

  it("builds preview from all non-empty blocks", () => {
    const preview = buildExportPreview({
      blocks: [
        { id: "b1", type: "camera", content: "wide shot", isActive: true },
        { id: "b2", type: "style", content: "painterly", isActive: false },
        { id: "b3", type: "format", content: "   ", isActive: true }
      ],
      tags: [],
      export_settings: {
        separator: ", ",
        include_labels: false
      }
    });

    expect(preview).toBe("wide shot, painterly");
  });

  it("reorders blocks for drag-and-drop editing", () => {
    const reordered = reorderBlocks(
      [
        { id: "b1", type: "camera", content: "one", isActive: true },
        { id: "b2", type: "style", content: "two", isActive: true },
        { id: "b3", type: "format", content: "three", isActive: true }
      ],
      0,
      2
    );

    expect(reordered.map((block) => block.id)).toEqual(["b2", "b3", "b1"]);
  });

  it("creates and restores a version snapshot", () => {
    const payload = createDefaultPayload("library");
    payload.blocks[0]!.content = "first draft";

    const version = createVersionSnapshot(
      {
        title: "测试资产",
        payload
      },
      "v1"
    );

    const withVersion = appendVersion(payload, version);
    withVersion.blocks[0]!.content = "second draft";

    const restored = restoreFromVersion(withVersion, version.id);

    expect(restored?.title).toBe("测试资产");
    expect(restored?.payload.blocks[0]?.content).toBe("first draft");
    expect(restored?.payload.versions).toHaveLength(1);
  });

  it("builds a storyboard markdown script", () => {
    const script = buildProjectScript([
      {
        id: "asset_1",
        folder_id: "folder_1",
        title: "镜头 01 / 建立镜头",
        is_favorite: false,
        updated_at: 1,
        payload: {
          blocks: [{ id: "b1", type: "camera", label: "镜头", content: "雨夜街角建立", isActive: true }],
          tags: [],
          remark: "建立世界观",
          storyboard: {
            shot_number: 1,
            duration_seconds: 4,
            transition: "硬切"
          },
          versions: [],
          export_settings: {
            separator: "\n",
            include_labels: true
          }
        }
      }
    ]);

    expect(script).toContain("## 镜头 1 · 镜头 01 / 建立镜头");
    expect(script).toContain("时长：4 秒");
    expect(script).toContain("转场：硬切");
  });

  it("imports plain text as blocks", () => {
    const imported = parseImportedAssets("第一段内容\n\n第二段内容", "library");

    expect(imported).toHaveLength(1);
    expect(imported[0]?.payload.blocks).toHaveLength(2);
    expect(imported[0]?.payload.blocks[0]?.content).toBe("第一段内容");
  });

  it("applies and strips project locked blocks safely", () => {
    const lockedBlock = toggleProjectLock({
      id: "b1",
      type: "custom",
      label: "固定设定",
      content: "霓虹赛博朋克夜景",
      isActive: true
    });

    const payload: PromptPayload = {
      blocks: [
        { id: "b2", type: "camera", label: "镜头", content: "近景跟拍", isActive: true }
      ],
      tags: [],
      export_settings: {
        separator: "\n",
        include_labels: true
      }
    };

    const applied = applyProjectLockedBlocksToPayload(payload, [lockedBlock]);
    expect(applied.blocks[0]?.label).toBe("固定设定");
    expect(applied.blocks[0]?.project_lock_id).toBeTruthy();
    expect(applied.blocks[1]?.content).toBe("近景跟拍");

    const stripped = stripProjectLockMetadata(applied);
    expect(stripped.blocks[0]?.project_lock_id).toBeUndefined();
    expect(stripped.blocks[0]?.is_locked).toBeUndefined();
  });

  it("syncs locked blocks across project assets", () => {
    const lockedBlock = toggleProjectLock({
      id: "b1",
      type: "custom",
      label: "公共提示词",
      content: "昭和末期复古未来主义",
      isActive: true
    });

    const currentDraft: PromptAsset = {
      id: "asset_1",
      folder_id: "project_1",
      title: "镜头 01",
      is_favorite: false,
      updated_at: 1,
      payload: {
        blocks: [
          lockedBlock,
          { id: "b2", type: "camera", label: "镜头", content: "低机位推进", isActive: true }
        ],
        tags: [],
        storyboard: { shot_number: 1 },
        versions: [],
        export_settings: {
          separator: "\n",
          include_labels: true
        }
      }
    };

    const siblingAsset: PromptAsset = {
      id: "asset_2",
      folder_id: "project_1",
      title: "镜头 02",
      is_favorite: false,
      updated_at: 2,
      payload: {
        blocks: [{ id: "b3", type: "style", label: "风格", content: "胶片颗粒", isActive: true }],
        tags: [],
        storyboard: { shot_number: 2 },
        versions: [],
        export_settings: {
          separator: "\n",
          include_labels: true
        }
      }
    };

    const synced = syncProjectLockedBlocks([currentDraft, siblingAsset], currentDraft);
    const syncedSibling = synced.find((asset) => asset.id === "asset_2");

    expect(syncedSibling?.payload.blocks[0]?.label).toBe("公共提示词");
    expect(syncedSibling?.payload.blocks[0]?.project_lock_id).toBe(lockedBlock.project_lock_id);
    expect(syncedSibling?.payload.blocks[1]?.content).toBe("胶片颗粒");
  });
});
