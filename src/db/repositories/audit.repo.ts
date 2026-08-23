import { getDatabase } from '../client';
import { auditLogs, AuditLog } from '../schema';
import { desc } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export interface CreateAuditLogParams {
  action: string;
  entityType: 'PATIENT' | 'VISIT' | 'PHOTO' | 'PRESCRIPTION' | 'BACKUP' | 'AUTH' | 'SETTINGS';
  entityId?: string;
  metadata?: Record<string, any>;
}

/**
 * Creates an append-only, tamper-evident audit log with hash chaining.
 */
export async function appendAuditLog(params: CreateAuditLogParams): Promise<AuditLog> {
  const { db } = await getDatabase();
  const id = `aud_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const timestamp = Date.now();
  const metadataString = params.metadata ? JSON.stringify(params.metadata) : null;

  // Retrieve the latest audit log entry to form the hash chain
  const [latestLog] = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(1);

  const previousHash = latestLog ? latestLog.hash : 'GENESIS_AAROGYA_V1';

  // Compute SHA-256 hash for this record
  const payloadToHash = `${id}|${params.action}|${params.entityType}|${params.entityId || ''}|${timestamp}|${metadataString || ''}|${previousHash}`;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    payloadToHash
  );

  const newLog: AuditLog = {
    id,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId || null,
    timestamp,
    metadata: metadataString,
    previousHash,
    hash,
  };

  await db.insert(auditLogs).values(newLog);
  return newLog;
}

/**
 * Retrieves the recent audit logs.
 */
export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  const { db } = await getDatabase();
  return await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(limit);
}
