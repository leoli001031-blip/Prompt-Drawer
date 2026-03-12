import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  createAiProfileDraft,
  deleteAiProfile as deleteAiProfileRecord,
  findAiProfile,
  getDefaultAiProfile,
  saveAiProfile as persistAiProfile,
  testAiProfile as testAiProfileConnection
} from "../lib/ai";
import type { AiProfileDraft, AiSettingsSnapshot } from "../types/ai";

export interface UseAiProfilesArgs {
  aiSettings: AiSettingsSnapshot;
  setAiSettings: Dispatch<SetStateAction<AiSettingsSnapshot>>;
  setStatusMessage: Dispatch<SetStateAction<string>>;
}

export function useAiProfiles({ aiSettings, setAiSettings, setStatusMessage }: UseAiProfilesArgs) {
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [selectedAiProfileId, setSelectedAiProfileId] = useState<string | null>(null);
  const [aiProfileDraft, setAiProfileDraft] = useState<AiProfileDraft>(() => createAiProfileDraft());
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestMessage, setAiTestMessage] = useState("");

  const activeAiProfile = useMemo(
    () =>
      findAiProfile(aiSettings, selectedAiProfileId) ??
      getDefaultAiProfile(aiSettings) ??
      aiSettings.profiles[0] ??
      null,
    [aiSettings, selectedAiProfileId]
  );

  useEffect(() => {
    if (activeAiProfile) {
      setSelectedAiProfileId(activeAiProfile.id);
    } else {
      setSelectedAiProfileId(null);
    }
  }, [activeAiProfile?.id]);

  function openAiSettings(): void {
    setAiSettingsOpen(true);
    setAiProfileDraft(createAiProfileDraft(activeAiProfile));
    setAiTestMessage("");
  }

  function startNewAiProfile(): void {
    setAiProfileDraft({
      ...createAiProfileDraft(),
      is_default: aiSettings.profiles.length === 0
    });
    setAiTestMessage("");
  }

  function selectAiProfile(profileId: string): void {
    const profile = findAiProfile(aiSettings, profileId);
    if (!profile) {
      return;
    }

    setSelectedAiProfileId(profile.id);
    setAiProfileDraft(createAiProfileDraft(profile));
    setAiTestMessage("");
  }

  async function saveAiProfile(): Promise<void> {
    const nextSettings = await persistAiProfile(aiProfileDraft);
    const nextProfile =
      (aiProfileDraft.id ? findAiProfile(nextSettings, aiProfileDraft.id) : nextSettings.profiles[0]) ?? null;
    setAiSettings(nextSettings);
    const profileId = nextProfile?.id ?? nextSettings.default_profile_id ?? nextSettings.profiles[0]?.id ?? null;
    setSelectedAiProfileId(profileId);
    setAiProfileDraft(createAiProfileDraft(findAiProfile(nextSettings, profileId)));
    setAiTestMessage("AI 配置已保存。");
    setStatusMessage("AI 配置已保存。");
  }

  async function deleteAiProfile(): Promise<void> {
    if (!aiProfileDraft.id) {
      setAiProfileDraft(createAiProfileDraft());
      return;
    }

    const nextSettings = await deleteAiProfileRecord(aiProfileDraft.id);
    const nextProfileId = nextSettings.default_profile_id ?? nextSettings.profiles[0]?.id ?? null;
    setAiSettings(nextSettings);
    setSelectedAiProfileId(nextProfileId);
    setAiProfileDraft(createAiProfileDraft(findAiProfile(nextSettings, nextProfileId)));
    setAiTestMessage("AI 配置已删除。");
    setStatusMessage("AI 配置已删除。");
  }

  async function testAiProfile(): Promise<void> {
    setAiTesting(true);
    setAiTestMessage("");
    try {
      const result = await testAiProfileConnection(aiProfileDraft);
      setAiTestMessage(`连接成功：${result}`);
    } catch (error) {
      setAiTestMessage(error instanceof Error ? error.message : "连接测试失败。");
    } finally {
      setAiTesting(false);
    }
  }

  return {
    aiSettingsOpen,
    setAiSettingsOpen,
    selectedAiProfileId,
    setSelectedAiProfileId,
    aiProfileDraft,
    setAiProfileDraft,
    aiTesting,
    aiTestMessage,
    activeAiProfile,
    openAiSettings,
    startNewAiProfile,
    selectAiProfile,
    saveAiProfile,
    deleteAiProfile,
    testAiProfile
  };
}
