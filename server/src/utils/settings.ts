import { prisma } from '../db.js';

/** 内存缓存，避免每次请求都查数据库 */
let settingsCache: Record<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30_000; // 30 秒

async function loadSettings(): Promise<Record<string, string>> {
  const now = Date.now();
  if (settingsCache && now - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  const rows = await prisma.setting.findMany();
  settingsCache = rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {} as Record<string, string>);
  cacheTimestamp = now;
  return settingsCache;
}

/** 获取设置值，优先数据库，其次环境变量 */
export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
  const settings = await loadSettings();
  if (settings[key] !== undefined) return settings[key];
  return process.env[key] ?? defaultValue;
}

/** 批量获取 */
export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const settings = await loadSettings();
  const result: Record<string, string> = {};
  for (const key of keys) {
    const val = settings[key] ?? process.env[key];
    if (val !== undefined) result[key] = val;
  }
  return result;
}

/** 清除缓存（设置更新后调用） */
export function clearSettingsCache() {
  settingsCache = null;
  cacheTimestamp = 0;
}

/** 将数据库设置同步到 process.env（启动时调用） */
export async function syncEnvFromDB() {
  const rows = await prisma.setting.findMany();
  for (const row of rows) {
    // 只有当环境变量未设置时，才用数据库值覆盖
    // 这样 .env 文件仍可作为 override
    if (process.env[row.key] === undefined || process.env[row.key] === '') {
      process.env[row.key] = row.value;
    }
  }
  clearSettingsCache();
}

/** 更新单个设置并同步到 process.env */
export async function setSetting(key: string, value: string) {
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
  process.env[key] = value;
  clearSettingsCache();
}

/** 批量更新并同步到 process.env */
export async function setSettings(settings: Record<string, string>) {
  const updates = Object.entries(settings).map(([key, value]) =>
    prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
  );
  await Promise.all(updates);
  for (const [key, value] of Object.entries(settings)) {
    process.env[key] = value;
  }
  clearSettingsCache();
}
