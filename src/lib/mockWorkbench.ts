import type { PromptPayload } from "../types/prompt";
import type { WorkbenchSnapshot } from "../types/storage";

function stringify(payload: PromptPayload): string {
  return JSON.stringify(payload);
}

const now = Date.now();

export const mockWorkbenchSnapshot: WorkbenchSnapshot = {
  folders: [
    {
      id: "folder_library_001",
      name: "角色模板库",
      type: "library",
      created_at: now - 1000 * 60 * 60 * 72
    },
    {
      id: "folder_library_002",
      name: "镜头语言库",
      type: "library",
      created_at: now - 1000 * 60 * 60 * 40
    },
    {
      id: "folder_project_001",
      name: "赛博短片项目",
      type: "project",
      created_at: now - 1000 * 60 * 60 * 8
    }
  ],
  prompt_assets: [
    {
      id: "asset_library_001",
      folder_id: "folder_library_001",
      title: "女主角基础人设",
      payload: stringify({
        blocks: [
          {
            id: "block_001",
            type: "character",
            content: "银白短发的东方赛博侦探，眼神冷静，黑色长风衣。",
            isActive: true
          },
          {
            id: "block_002",
            type: "style",
            content: "电影级灯光，写实质感，雨夜霓虹氛围。",
            isActive: true
          },
          {
            id: "block_003",
            type: "format",
            content: "竖版海报构图，8k 细节。",
            isActive: true
          }
        ],
        tags: ["角色", "生图", "主角"],
        export_settings: {
          separator: "\n",
          include_labels: true
        }
      }),
      is_favorite: 1,
      updated_at: now - 1000 * 60 * 90
    },
    {
      id: "asset_library_002",
      folder_id: "folder_library_002",
      title: "追踪开场镜头模板",
      payload: stringify({
        blocks: [
          {
            id: "block_004",
            type: "camera",
            content: "广角建立镜头，俯拍雨夜街区，车辆拖影。",
            isActive: true
          },
          {
            id: "block_005",
            type: "style",
            content: "冷色主调，局部霓虹红色高光。",
            isActive: true
          },
          {
            id: "block_006",
            type: "custom",
            content: "适合视频开场前三秒建立世界观。",
            isActive: false
          }
        ],
        tags: ["镜头", "视频", "开场"],
        export_settings: {
          separator: ", ",
          include_labels: false
        }
      }),
      is_favorite: 0,
      updated_at: now - 1000 * 60 * 30
    },
    {
      id: "asset_project_001",
      folder_id: "folder_project_001",
      title: "镜头 01 / 雨夜街角建立",
      payload: stringify({
        blocks: [
          {
            id: "block_007",
            type: "camera",
            content: "远景建立镜头，低机位扫过潮湿街道。",
            isActive: true
          },
          {
            id: "block_008",
            type: "style",
            content: "街面反光明显，霓虹招牌带轻微雾化。",
            isActive: true
          },
          {
            id: "block_009",
            type: "format",
            content: "16:9，电影感，轻微颗粒。",
            isActive: true
          }
        ],
        tags: ["项目", "分镜", "镜头01"],
        remark: "建立世界观，人物暂不入镜。",
        export_settings: {
          separator: "\n",
          include_labels: true
        }
      }),
      is_favorite: 1,
      updated_at: now - 1000 * 60 * 12
    }
  ]
};
