// Api::FeatureFlagsController — GET /feature_flags (update is chunk-2+:
// no SPA call sites today).

import { Hono } from 'hono';
import type { AppEnv } from '../index';
import { originGuard, requireAuth } from '../auth';
import { FEATURE_FLAGS, featureFlagEnabled, success } from './util';

const router = new Hono<AppEnv>();
router.use('*', originGuard, requireAuth);

router.get('/', async (c) => {
  const user = c.get('user');
  const flags: Record<string, boolean> = {};
  for (const key of FEATURE_FLAGS) {
    flags[key] = await featureFlagEnabled(c, key, user.id);
  }
  return success(c, { flags });
});

export default router;
