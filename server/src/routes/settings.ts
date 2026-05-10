import { Router } from 'express';
import { getSettings, setSettings, setSetting } from '../utils/settings.js';
import { resetDeepseekClient } from '../services/ai.js';
import { resetEmailTransporter } from '../services/email.js';

function notifyServiceChanges(keys: string[]) {
  if (keys.some(k => k.startsWith('DEEPSEEK_'))) {
    resetDeepseekClient();
  }
  if (keys.some(k => k.startsWith('SMTP_') || k === 'NOTIFY_EMAIL')) {
    resetEmailTransporter();
  }
}

const router = Router();

// 获取所有设置（支持传入 keys 查询指定配置）
router.get('/', async (req, res) => {
  try {
    const keysParam = req.query.keys as string | undefined;
    if (keysParam) {
      const keys = keysParam.split(',');
      const settings = await getSettings(keys);
      res.json(settings);
    } else {
      // 返回常用配置项的合并值（DB + env）
      const commonKeys = [
        'DEEPSEEK_API_KEY',
        'TWITTER_API_KEY',
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_SECURE',
        'SMTP_USER',
        'SMTP_PASS',
        'NOTIFY_EMAIL',
        'PORT',
        'CLIENT_URL'
      ];
      const settings = await getSettings(commonKeys);
      res.json(settings);
    }
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// 更新设置
router.put('/', async (req, res) => {
  try {
    const settings = req.body;

    if (typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings format' });
    }

    await setSettings(settings);
    notifyServiceChanges(Object.keys(settings));

    res.json({ message: 'Settings updated', needRestart: false });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// 获取单个设置
router.get('/:key', async (req, res) => {
  try {
    const settings = await getSettings([req.params.key]);

    if (settings[req.params.key] === undefined) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ key: req.params.key, value: settings[req.params.key] });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// 更新单个设置
router.put('/:key', async (req, res) => {
  try {
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await setSetting(req.params.key, String(value));
    notifyServiceChanges([req.params.key]);

    res.json({ key: req.params.key, value: String(value) });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

export default router;
