import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useToastStore } from "../store/useToastStore";

export async function copyToClipboard(text: string) {
  await Clipboard.setStringAsync(text);
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
  useToastStore.getState().show("已复制");
}

