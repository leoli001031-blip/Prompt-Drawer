import type { FolderType, PromptAsset } from "../../types/storage";

export interface AssetHeaderProps {
  asset: PromptAsset;
  selectedFolderType: FolderType | null | undefined;
  isEditingTitle: boolean;
  saveStateLabel: string;
  onStartEditingTitle: () => void;
  onStopEditingTitle: () => void;
  onChangeTitle: (value: string) => void;
  onChangeFavorite: (value: boolean) => void;
  onChangeTags: (value: string) => void;
  onChangeShotNumber: (value: number) => void;
  onChangeDurationSeconds: (value: string) => void;
  onChangeTransition: (value: string) => void;
  onBack: () => void;
}

export function AssetHeader({
  asset,
  selectedFolderType,
  isEditingTitle,
  saveStateLabel,
  onStartEditingTitle,
  onStopEditingTitle,
  onChangeTitle,
  onChangeFavorite,
  onChangeTags,
  onChangeShotNumber,
  onChangeDurationSeconds,
  onChangeTransition,
  onBack
}: AssetHeaderProps) {
  const saveStateClassName =
    saveStateLabel === "已保存"
      ? "border-[#bfd0c7] bg-[#e6eeea] text-[#74877d]"
      : saveStateLabel === "保存中"
        ? "border-[#c6d2cc] bg-[#e8eeeb] text-[#7a8b82]"
        : "border-[#d8c4b5] bg-[#efe4db] text-[#9a7e6e]";

  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Header</div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {isEditingTitle ? (
              <input
                autoFocus
                value={asset.title}
                onChange={(event) => onChangeTitle(event.target.value)}
                onBlur={onStopEditingTitle}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "Escape") {
                    event.preventDefault();
                    onStopEditingTitle();
                  }
                }}
                aria-label="标题"
                placeholder="未命名资产"
                className="min-w-[280px] flex-[1.1] rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-2xl font-semibold tracking-tight text-[#5e5851] placeholder:text-[#b0a598]"
              />
            ) : (
              <button
                type="button"
                onClick={onStartEditingTitle}
                className="min-w-[280px] flex-[1.1] rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-left text-2xl font-semibold tracking-tight text-[#5e5851]"
              >
                {asset.title.trim() || "未命名资产"}
              </button>
            )}
            <span className={["rounded-full border px-2.5 py-1 text-[11px]", saveStateClassName].join(" ")}>
              {saveStateLabel}
            </span>
            <label className="flex shrink-0 items-center gap-3 rounded-2xl border border-[#d8cfc5] bg-[#f3ede6] px-4 py-3 text-sm text-[#6a645c]">
              <input
                type="checkbox"
                checked={asset.is_favorite}
                onChange={(event) => onChangeFavorite(event.target.checked)}
                className="h-4 w-4"
              />
              收藏
            </label>
            <input
              value={asset.payload.tags.join(", ")}
              onChange={(event) => onChangeTags(event.target.value)}
              placeholder="标签：角色, 生图, 镜头01"
              aria-label="标签"
              className="min-w-[260px] flex-1 rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
            />
          </div>

          {selectedFolderType === "project" ? (
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                  镜头编号
                </span>
                <input
                  type="number"
                  min={1}
                  value={asset.payload.storyboard?.shot_number ?? 1}
                  onChange={(event) => onChangeShotNumber(Number(event.target.value || 1))}
                  className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                  时长（秒）
                </span>
                <input
                  type="number"
                  min={0}
                  value={asset.payload.storyboard?.duration_seconds ?? ""}
                  onChange={(event) => onChangeDurationSeconds(event.target.value)}
                  className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] uppercase tracking-[0.18em] text-[#9a9085]">
                  转场
                </span>
                <input
                  value={asset.payload.storyboard?.transition ?? ""}
                  onChange={(event) => onChangeTransition(event.target.value)}
                  placeholder="如：硬切、淡入"
                  className="w-full rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851]"
                />
              </label>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-[#d8cfc5] bg-[#f8f3ed] px-3 py-2 text-sm text-[#6a645c] hover:bg-[#efe8df]"
        >
          返回列表
        </button>
      </div>
    </article>
  );
}
