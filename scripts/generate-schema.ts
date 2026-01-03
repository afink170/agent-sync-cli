import { Config } from '@/types/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRootDir = path.join(__dirname, '..');
const schemaPath = 'schemas/agent-sync-config.json';
const $id = `https://raw.githubusercontent.com/afink170/agent-sync-cli/refs/heads/main/${schemaPath}`;

const schema = Config.toJSONSchema({
  target: 'draft-2020-12',
  override({ jsonSchema, path }) {
    if (path.length === 0) {
      jsonSchema.$id = $id;
    }
  },
});

fs.writeFileSync(
  path.join(repoRootDir, schemaPath),
  JSON.stringify(schema, null, 2)
);
