import type { AiProviderProfile, AiTaskResult, AiTaskType } from "../../types/ai";
import type { PromptBlock, PromptVersionSnapshot } from "../../types/prompt";
import type { FolderRecord } from "../../types/storage";
import { ActionsCard } from "./ActionsCard";
import { AiAssistantCard } from "./AiAssistantCard";
import { AiResultCard } from "./AiResultCard";
import { AiToggleCard } from "./AiToggleCard";
import { ExportPreviewCard } from "./ExportPreviewCard";
import { VersionHistoryCard } from "./VersionHistoryCard";

export interface RightPanelProps {
  exportPreview: string;
  copyFeedback: string;
  onCopyExport: () => void;
  aiPanelOpen: boolean;
  onToggleAiPanel: () => void;
  onOpenAiSettings: () => void;
  activeAiProfile: AiProviderProfile | null;
  selectedAiProfileId: string | null;
  aiProfiles: AiProviderProfile[];
  aiTaskType: AiTaskType;
  onSelectAiProfile: (value: string) => void;
  onSelectAiTaskType: (value: AiTaskType) => void;
  blocks: PromptBlock[];
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
  onSaveAsset: () => void;
  onDuplicateCurrentAsset: () => void;
  copyTargetFolderId: string | null;
  onChangeCopyTargetFolderId: (value: string) => void;
  folders: FolderRecord[];
  confirmAssetDelete: boolean;
  onDeleteAsset: () => void;
  versionName: string;
  onChangeVersionName: (value: string) => void;
  onCreateVersion: () => void;
  versions: PromptVersionSnapshot[];
  onRestoreVersion: (versionId: string) => void;
}

export function RightPanel({
  exportPreview,
  copyFeedback,
  onCopyExport,
  aiPanelOpen,
  onToggleAiPanel,
  onOpenAiSettings,
  activeAiProfile,
  selectedAiProfileId,
  aiProfiles,
  aiTaskType,
  onSelectAiProfile,
  onSelectAiTaskType,
  blocks,
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
  onSaveAsset,
  onDuplicateCurrentAsset,
  copyTargetFolderId,
  onChangeCopyTargetFolderId,
  folders,
  confirmAssetDelete,
  onDeleteAsset,
  versionName,
  onChangeVersionName,
  onCreateVersion,
  versions,
  onRestoreVersion
}: RightPanelProps) {
  return (
    <section className="min-h-0 overflow-y-auto pr-1 space-y-5">
      <ExportPreviewCard
        exportPreview={exportPreview}
        copyFeedback={copyFeedback}
        onCopyExport={onCopyExport}
      />

      <AiToggleCard aiPanelOpen={aiPanelOpen} onToggleAiPanel={onToggleAiPanel} />

      {aiPanelOpen ? (
        <>
          <AiAssistantCard
            onOpenAiSettings={onOpenAiSettings}
            activeAiProfile={activeAiProfile}
            selectedAiProfileId={selectedAiProfileId}
            aiProfiles={aiProfiles}
            aiTaskType={aiTaskType}
            onSelectAiProfile={onSelectAiProfile}
            onSelectAiTaskType={onSelectAiTaskType}
            blocks={blocks}
            aiTargetBlockId={aiTargetBlockId}
            onSelectAiTargetBlock={onSelectAiTargetBlock}
            aiInstruction={aiInstruction}
            onChangeAiInstruction={onChangeAiInstruction}
            aiRunning={aiRunning}
            onRunAi={onRunAi}
            aiRunMessage={aiRunMessage}
          />

          <AiResultCard
            aiResult={aiResult}
            aiTaskType={aiTaskType}
            aiTargetBlockId={aiTargetBlockId}
            onApplyAiToTargetBlock={onApplyAiToTargetBlock}
            onAppendAiAsBlock={onAppendAiAsBlock}
            onCopyAiResult={onCopyAiResult}
          />
        </>
      ) : null}

      <ActionsCard
        isManualSaving={isManualSaving}
        onSaveAsset={onSaveAsset}
        onDuplicateCurrentAsset={onDuplicateCurrentAsset}
        copyTargetFolderId={copyTargetFolderId}
        onChangeCopyTargetFolderId={onChangeCopyTargetFolderId}
        folders={folders}
        confirmAssetDelete={confirmAssetDelete}
        onDeleteAsset={onDeleteAsset}
      />

      <VersionHistoryCard
        versionName={versionName}
        onChangeVersionName={onChangeVersionName}
        onCreateVersion={onCreateVersion}
        versions={versions}
        onRestoreVersion={onRestoreVersion}
      />
    </section>
  );
}
