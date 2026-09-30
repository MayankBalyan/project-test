import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/** Writes the text to a temporary file and opens the share sheet so the user can save or send it. */
export async function shareTextFile(fileName: string, text: string, mimeType: string) {
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true });
  file.write(text);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
}
