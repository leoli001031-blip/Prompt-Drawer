import { describe, expect, it } from "vitest";
import { buildExportPreview, parsePromptPayload, reorderBlocks } from "./payload";

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
});
