import type { Dispatch, SetStateAction } from "react";
import type { AiSettingsSnapshot } from "../types/ai";
import type { FolderType, PromptAsset } from "../types/storage";
import { useAiProfiles } from "./useAiProfiles";
import { useAiRunner } from "./useAiRunner";

export interface UseAiAssistantArgs {
  aiSettings: AiSettingsSnapshot;
  setAiSettings: Dispatch<SetStateAction<AiSettingsSnapshot>>;
  assetDraft: PromptAsset | null;
  setAssetDraft: Dispatch<SetStateAction<PromptAsset | null>>;
  selectedFolderType: FolderType | null | undefined;
  setStatusMessage: Dispatch<SetStateAction<string>>;
}

export function useAiAssistant({
  aiSettings,
  setAiSettings,
  assetDraft,
  setAssetDraft,
  selectedFolderType,
  setStatusMessage
}: UseAiAssistantArgs) {
  const profileState = useAiProfiles({
    aiSettings,
    setAiSettings,
    setStatusMessage
  });

  const runnerState = useAiRunner({
    activeAiProfile: profileState.activeAiProfile,
    assetDraft,
    setAssetDraft,
    selectedFolderType,
    setStatusMessage
  });

  return {
    ...profileState,
    ...runnerState
  };
}
