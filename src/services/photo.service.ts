import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { addPatientPhoto, getPatientPhotos, softDeletePatientPhoto } from '../db/repositories/photo.repo';
import { PatientPhoto } from '../db/schema';

const MEDIA_DIR_NAME = 'media/photos';

/**
 * Ensures the app-private photos directory exists in the document sandbox.
 */
export async function ensureMediaDirectory(): Promise<string> {
  const mediaDir = `${FileSystem.documentDirectory}${MEDIA_DIR_NAME}/`;
  const dirInfo = await FileSystem.getInfoAsync(mediaDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(mediaDir, { intermediates: true });
  }
  return mediaDir;
}

/**
 * Returns the absolute URI for a relative file path stored in the DB.
 */
export function getAbsolutePhotoUri(relativePath: string): string {
  if (relativePath.startsWith('file://') || relativePath.startsWith('http')) {
    return relativePath;
  }
  return `${FileSystem.documentDirectory}${relativePath}`;
}

/**
 * Saves a local image into private sandbox storage with an opaque UUID filename.
 */
export async function savePatientImage(
  patientId: string,
  sourceUri: string,
  photoType: 'PROFILE' | 'CLINICAL' = 'PROFILE'
): Promise<PatientPhoto> {
  await ensureMediaDirectory();

  // Generate opaque UUID filename
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const uuid = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const extension = sourceUri.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = extension.includes('?') ? extension.split('?')[0] : extension;
  const fileName = `${uuid}.${cleanExt}`;
  const relativePath = `${MEDIA_DIR_NAME}/${fileName}`;
  const destinationUri = `${FileSystem.documentDirectory}${relativePath}`;

  // Copy file into private sandbox
  await FileSystem.copyAsync({
    from: sourceUri,
    to: destinationUri,
  });

  // Calculate file size and SHA-256 hash
  const fileInfo = await FileSystem.getInfoAsync(destinationUri);
  const fileSize = (fileInfo.exists && 'size' in fileInfo) ? fileInfo.size : 0;

  // Compute hash of file content
  let sha256: string | undefined;
  try {
    const base64Data = await FileSystem.readAsStringAsync(destinationUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    sha256 = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      base64Data
    );
  } catch {
    sha256 = undefined;
  }

  return await addPatientPhoto({
    patientId,
    filePath: relativePath,
    photoType,
    mimeType: cleanExt === 'png' ? 'image/png' : 'image/jpeg',
    fileSize,
    sha256,
  });
}

export { getPatientPhotos, softDeletePatientPhoto };
