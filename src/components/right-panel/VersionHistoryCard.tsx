import { formatTime } from "../../utils/format";
import type { PromptVersionSnapshot } from "../../types/prompt";

export interface VersionHistoryCardProps {
  versionName: string;
  onChangeVersionName: (value: string) => void;
  onCreateVersion: () => void;
  versions: PromptVersionSnapshot[];
  onRestoreVersion: (versionId: string) => void;
}

export function VersionHistoryCard({
  versionName,
  onChangeVersionName,
  onCreateVersion,
  versions,
  onRestoreVersion
}: VersionHistoryCardProps) {
  return (
    <article className="rounded-[28px] border border-[#d8cfc5] bg-[#f8f3ed]/90 p-5">
      <div className="text-[11px] uppercase tracking-[0.24em] text-[#9a9085]">Version History</div>
      <div className="mt-4 flex gap-2">
        <input
          value={versionName}
          onChange={(event) => onChangeVersionName(event.target.value)}
          placeholder="版本名称（可选）"
          className="min-w-0 flex-1 rounded-2xl border border-[#d8cfc5] bg-[#fcf8f4] px-4 py-3 text-sm text-[#5e5851] placeholder:text-[#b0a598]"
        />
        <button
          type="button"
          onClick={onCreateVersion}
          className="rounded-2xl bg-[#e2ddd5] px-4 py-3 text-sm font-medium text-[#5a544d] hover:bg-[#d6cec5]"
        >
          创建版本
        </button>
      </div>
      <div className="mt-4 max-h-[240px] space-y-2 overflow-y-auto">
        {versions.length > 0 ? (
          versions.map((version) => (
            <div
              key={version.id}
              className="rounded-2xl border border-[#d8cfc5] bg-[#f7f1ea] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-[#5b554e]">{version.name}</div>
                  <div className="mt-1 text-xs text-[#988f84]">{formatTime(version.created_at)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onRestoreVersion(version.id)}
                  className="rounded-full border border-[#d8cfc5] bg-[#fcf8f4] px-3 py-1 text-xs text-[#6a645c] hover:bg-[#efe8df]"
                >
                  恢复
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#d8cfc5] bg-[#fbf7f2] px-4 py-5 text-sm text-[#988f84]">
            当前还没有版本快照。
          </div>
        )}
      </div>
    </article>
  );
}
