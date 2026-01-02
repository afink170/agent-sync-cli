#!/usr/bin/env node

import { logger } from '@/core/logger';
import { createCli } from 'trpc-cli';
import { router } from './router';

createCli({ router, name: 'agent-sync' }).run({ logger });
