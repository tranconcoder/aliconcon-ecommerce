import dotenv from 'dotenv';
import path from 'path';
import { existsSync } from 'fs';

const NODE_ENV = process.env.NODE_ENV || 'development';
const envPath = path.join(import.meta.dirname, `../../../.env.${NODE_ENV}.local`);
const fallbackEnvPath = path.join(import.meta.dirname, `../../../.env`);

const finalPath = existsSync(envPath) ? envPath : fallbackEnvPath;

dotenv.config({
    path: finalPath,
    override: true
});
