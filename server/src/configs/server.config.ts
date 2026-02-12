import path from 'path';
import { getEnv, EnvKey } from '../api/helpers/env.helper.js';

// Version control
export const API_VERSION = 'v1';

// Server configs
export const PORT = getEnv(EnvKey.PORT, true);
export const HOST = getEnv(EnvKey.HOST, true);
export const BASE_URL = `http://${HOST}:${PORT}`;

// Environment
export const NODE_ENV = getEnv(EnvKey.NODE_ENV, false, 'development') as 'development' | 'production';

// Paginate
export const ITEM_PER_PAGE = 48;

// File
export const PUBLIC_PATH = path.join(import.meta.dirname, '../../public');
