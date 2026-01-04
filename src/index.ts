#!/usr/bin/env node

import { logger } from '@/core/logger';
import { createCli } from 'trpc-cli';
import { version } from '../package.json';
import { router } from './router';

createCli({ router, name: 'agent-sync', version }).run({ logger });
