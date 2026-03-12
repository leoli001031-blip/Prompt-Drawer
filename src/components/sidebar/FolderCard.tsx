import type { KeyboardEvent, MouseEvent } from "react";
import { formatFolderType } from "../../utils/format";
import type { FolderRecord } from "../../types/storage";

export interface FolderCardProps {
  folder: FolderRecord;
  isActive: boolean;
  isEditing: boolean;
  editingFolderName: string;
  onSelectFolder: (folderId: string) => void;
  onOpenFolderContextMenu: (event: MouseEvent, folder: FolderRecord) => void;
  onBeginFolderRename: (folder: FolderRecord) => void;
  onChangeEditingFolderName: (value: string) => void;
  onCommitFolderRename: (folder: FolderRecord) => void;
  onCancelFolderRename: () => void;
}

export function FolderCard({
  folder,
  isActive,
  isEditing,
  editingFolderName,
  onSelectFolder,
  onOpenFolderContextMenu,
  onBeginFolderRename,
  onChangeEditingFolderName,
  onCommitFolderRename,
  onCancelFolderRename
}: FolderCardProps) {
  const handleFolderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.key === "Enter" || event.key === " ") && !isEditing) {
      event.preventDefault();
      onSelectFolder(folder.id);
    }
  };

  return (
    <div
      onClick={() => onSelectFolder(folder.id)}
      onContextMenu={(event) => onOpenFolderContextMenu(event, folder)}
      onKeyDown={handleFolderKeyDown}
      role="button"
      tabIndex={0}
      className={[
        "w-full rounded-2xl border px-3 py-3 text-left transition",
        isActive
          ? "border-[#adbbb0] bg-[#dde5df] shadow-[0_0_0_1px_rgba(168,183,173,0.28)]"
          : "border-[#ddd5cc] bg-[#f8f3ed] hover:border-[#cbc0b4] hover:bg-[#f1ebe3]"
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        {isEditing ? (
          <input
            autoFocus
            value={editingFolderName}
            onChange={(event) => onChangeEditingFolderName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            onBlur={() => onCommitFolderRename(folder)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCommitFolderRename(folder);
              }
              if (event.key === "Escape") {
                event.preventDefault();
                onCancelFolderRename();
              }
            }}
            className="min-w-0 flex-1 rounded-xl border border-[#cbc0b4] bg-[#fcf8f4] px-3 py-2 text-sm font-medium text-[#5b554e] outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onBeginFolderRename(folder);
            }}
            className="min-w-0 truncate text-sm font-medium text-[#5b554e]"
          >
            {folder.name}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-[#988f84]">{formatFolderType(folder.type)}</p>
    </div>
  );
}
