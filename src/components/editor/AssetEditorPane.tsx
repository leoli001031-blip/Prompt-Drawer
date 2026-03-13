import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";
import type { FolderRecord, FolderType, PromptAsset } from "../../types/storage";
import type { AiProviderProfile, AiTaskResult, AiTaskType } from "../../types/ai";
import type { PromptVersionSnapshot } from "../../types/prompt";
import type { BlockTemplate } from "../../types/settings";
import { splitTags } from "../../utils/asset";
import { AssetHeader } from "./AssetHeader";
import { BlockList } from "./BlockList";
import { RightPanel } from "../right-panel/RightPanel";

export interface AssetEditorPaneProps {
  assetDraft: PromptAsset;
  selectedFolderType: FolderType | null | undefined;
  setAssetDraft: Dispatch<SetStateAction<PromptAsset | null>>;
  isEditingAssetTitle: boolean;
  setIsEditingAssetTitle: (value: boolean) => void;
  saveStateLabel: string;
  onBack: () => void;
  draggingBlockId: string | null;
  dragOverBlockId: string | null;
  blockTemplates: BlockTemplate[];
  onAddBlock: (template?: BlockTemplate | null) => void;
  onBlockPointerDown: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onBlockPointerEnter: (event: ReactPointerEvent<HTMLElement>, blockId: string) => void;
  onUpdateBlock: (blockId: string, patch: Partial<{ label: string; content: string }>) => void;
  onToggleBlockLock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onClearDragState: () => void;
  exportPreview: string;
  copyFeedback: string;
  onCopyExport: () => void;
  isTrashViewOpen: boolean;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
  onOpenAiSettings: () => void;
  activeAiProfile: AiProviderProfile | null;
  selectedAiProfileId: string | null;
  aiProfiles: AiProviderProfile[];
  aiTaskType: AiTaskType;
  onSelectAiProfile: (value: string) => void;
  onSelectAiTaskType: (value: AiTaskType) => void;
  aiTargetBlockId: string | null;
  onSelectAiTargetBlock: (value: string) => void;
  aiInstruction: string;
  onChangeAiInstruction: (value: string) => void;
  aiRunning: boolean;
  onRunAi: () => void;
  aiRunMessage: string;
  aiResult: AiTaskResult | null;
  onApplyAiToTargetBlock: () => void;
  onAppendAiAsBlock: () => void;
  onCopyAiResult: () => void;
  isManualSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndoDraft: () => void;
  onRedoDraft: () => void;
  onSaveAsset: () => void;
  onDuplicateCurrentAsset: () => void;
  copyTargetFolderId: string | null;
  onChangeCopyTargetFolderId: (value: string) => void;
  folders: FolderRecord[];
  confirmPermanentDelete: boolean;
  onMoveAssetToTrash: () => void;
  onRestoreAsset: () => void;
  onPermanentlyDeleteAsset: () => void;
  versionName: string;
  onChangeVersionName: (value: string) => void;
  onCreateVersion: () => void;
  versions: PromptVersionSnapshot[];
  onRestoreVersion: (versionId: string) => void;
}

export function AssetEditorPane({
  assetDraft,
  selectedFolderType,
  setAssetDraft,
  isEditingAssetTitle,
  setIsEditingAssetTitle,
  saveStateLabel,
  onBack,
  draggingBlockId,
  dragOverBlockId,
  blockTemplates,
  onAddBlock,
  onBlockPointerDown,
  onBlockPointerEnter,
  onUpdateBlock,
  onToggleBlockLock,
  onDuplicateBlock,
  onRemoveBlock,
  onClearDragState,
  exportPreview,
  copyFeedback,
  onCopyExport,
  isTrashViewOpen,
  aiPanelOpen,
  onToggleAiPanel,
  onOpenAiSettings,
  activeAiProfile,
  selectedAiProfileId,
  aiProfiles,
  aiTaskType,
  onSelectAiProfile,
  onSelectAiTaskType,
  aiTargetBlockId,
  onSelectAiTargetBlock,
  aiInstruction,
  onChangeAiInstruction,
  aiRunning,
  onRunAi,
  aiRunMessage,
  aiResult,
  onApplyAiToTargetBlock,
  onAppendAiAsBlock,
  onCopyAiResult,
  isManualSaving,
  canUndo,
  canRedo,
  onUndoDraft,
  onRedoDraft,
  onSaveAsset,
  onDuplicateCurrentAsset,
  copyTargetFolderId,
  onChangeCopyTargetFolderId,
  folders,
  confirmPermanentDelete,
  onMoveAssetToTrash,
  onRestoreAsset,
  onPermanentlyDeleteAsset,
  versionName,
  onChangeVersionName,
  onCreateVersion,
  versions,
  onRestoreVersion
}: AssetEditorPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-[#d8cfc5] bg-[#f2ece4] shadow-[0_18px_60px_rgba(116,106,94,0.06)]">
      <div className="min-h-0 flex-1 px-6 py-5">
        <div className="grid h-full min-h-0 gap-5 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <section className="min-h-0 overflow-y-auto pr-1">
            <div className="space-y-5 pb-2">
              <AssetHeader
                asset={assetDraft}
                selectedFolderType={selectedFolderType}
                isEditingTitle={isEditingAssetTitle}
                saveStateLabel={saveStateLabel}
                onStartEditingTitle={() => setIsEditingAssetTitle(true)}
                onStopEditingTitle={() => setIsEditingAssetTitle(false)}
                onChangeTitle={(value) => setAssetDraft({ ...assetDraft, title: value })}
                onChangeFavorite={(value) =>
                  setAssetDraft({
                    ...assetDraft,
                    is_favorite: value
                  })
                }
                onChangeTags={(value) =>
                  setAssetDraft({
                    ...assetDraft,
                    payload: {
                      ...assetDraft.payload,
                      tags: splitTags(value)
                    }
                  })
                }
                onChangeShotNumber={(value) =>
                  setAssetDraft({
                    ...assetDraft,
                    payload: {
                      ...assetDraft.payload,
                      storyboard: {
                        shot_number: value,
                        duration_seconds: assetDraft.payload.storyboard?.duration_seconds,
                        transition: assetDraft.payload.storyboard?.transition ?? ""
                      }
                    }
                  })
                }
                onChangeDurationSeconds={(value) =>
                  setAssetDraft({
                    ...assetDraft,
                    payload: {
                      ...assetDraft.payload,
                      storyboard: {
                        shot_number: assetDraft.payload.storyboard?.shot_number ?? 1,
                        duration_seconds: value ? Number(value) : undefined,
                        transition: assetDraft.payload.storyboard?.transition ?? ""
                      }
                    }
                  })
                }
                onChangeTransition={(value) =>
                  setAssetDraft({
                    ...assetDraft,
                    payload: {
                      ...assetDraft.payload,
                      storyboard: {
                        shot_number: assetDraft.payload.storyboard?.shot_number ?? 1,
                        duration_seconds: assetDraft.payload.storyboard?.duration_seconds,
                        transition: value
                      }
                    }
                  })
                }
                onBack={onBack}
              />

              <BlockList
                blocks={assetDraft.payload.blocks}
                blockTemplates={blockTemplates}
                selectedFolderType={selectedFolderType}
                draggingBlockId={draggingBlockId}
                dragOverBlockId={dragOverBlockId}
                onAddBlock={onAddBlock}
                onBlockPointerDown={onBlockPointerDown}
                onBlockPointerEnter={onBlockPointerEnter}
                onLabelChange={(blockId, value) => onUpdateBlock(blockId, { label: value })}
                onContentChange={(blockId, value) => onUpdateBlock(blockId, { content: value })}
                onToggleLock={onToggleBlockLock}
                onDuplicate={onDuplicateBlock}
                onRemove={onRemoveBlock}
                onClearDragState={onClearDragState}
              />
            </div>
          </section>

          <RightPanel
            exportPreview={exportPreview}
            copyFeedback={copyFeedback}
            onCopyExport={onCopyExport}
            isTrashViewOpen={isTrashViewOpen}
            aiPanelOpen={aiPanelOpen}
            onToggleAiPanel={onToggleAiPanel}
            onOpenAiSettings={onOpenAiSettings}
            activeAiProfile={activeAiProfile}
            selectedAiProfileId={selectedAiProfileId}
            aiProfiles={aiProfiles}
            aiTaskType={aiTaskType}
            onSelectAiProfile={onSelectAiProfile}
            onSelectAiTaskType={onSelectAiTaskType}
            blocks={assetDraft.payload.blocks}
            aiTargetBlockId={aiTargetBlockId}
            onSelectAiTargetBlock={onSelectAiTargetBlock}
            aiInstruction={aiInstruction}
            onChangeAiInstruction={onChangeAiInstruction}
            aiRunning={aiRunning}
            onRunAi={onRunAi}
            aiRunMessage={aiRunMessage}
            aiResult={aiResult}
            onApplyAiToTargetBlock={onApplyAiToTargetBlock}
            onAppendAiAsBlock={onAppendAiAsBlock}
            onCopyAiResult={onCopyAiResult}
            isManualSaving={isManualSaving}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndoDraft={onUndoDraft}
            onRedoDraft={onRedoDraft}
            onSaveAsset={onSaveAsset}
            onDuplicateCurrentAsset={onDuplicateCurrentAsset}
            copyTargetFolderId={copyTargetFolderId}
            onChangeCopyTargetFolderId={onChangeCopyTargetFolderId}
            folders={folders}
            confirmPermanentDelete={confirmPermanentDelete}
            onMoveAssetToTrash={onMoveAssetToTrash}
            onRestoreAsset={onRestoreAsset}
            onPermanentlyDeleteAsset={onPermanentlyDeleteAsset}
            versionName={versionName}
            onChangeVersionName={onChangeVersionName}
            onCreateVersion={onCreateVersion}
            versions={versions}
            onRestoreVersion={onRestoreVersion}
          />
        </div>
      </div>
    </div>
  );
}
