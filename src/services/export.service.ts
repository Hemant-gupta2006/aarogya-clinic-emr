import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { generateAndShareMultiSheetXlsx, shareXlsxFile } from './xlsx.service';

/**
 * Generates and returns the genuine multi-sheet .xlsx workbook path.
 */
export async function exportPatientsExcel(): Promise<string> {
  return await generateAndShareMultiSheetXlsx({ dateRangeType: 'ALL' });
}

/**
 * Shares a file using the native Android share sheet.
 */
export async function shareExportFile(
  filePath: string,
  mimeType: string = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  title: string = 'Export AarogyaEMR Clinical Excel Workbook (.xlsx)'
): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType,
      dialogTitle: title,
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}
