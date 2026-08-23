import { getDatabase } from '../client';
import { appMetadata, appSettings } from '../schema';
import { eq } from 'drizzle-orm';

export async function getMetadataValue(key: string): Promise<string | null> {
  const { db } = await getDatabase();
  const [record] = await db.select().from(appMetadata).where(eq(appMetadata.key, key));
  return record ? record.value : null;
}

export async function setMetadataValue(key: string, value: string): Promise<void> {
  const { db } = await getDatabase();
  const now = Date.now();
  await db
    .insert(appMetadata)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: appMetadata.key,
      set: { value, updatedAt: now },
    });
}

export async function getAppSettings(): Promise<Record<string, string>> {
  const { db } = await getDatabase();
  const records = await db.select().from(appSettings);
  const settings: Record<string, string> = {};
  for (const r of records) {
    settings[r.key] = r.value;
  }
  return settings;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const { db } = await getDatabase();
  const now = Date.now();
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: now },
    });
}
