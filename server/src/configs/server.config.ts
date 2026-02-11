import path from 'path';
import { getEnv } from '../api/helpers/env.helper.js';

// Version control
export const API_VERSION = 'v1';

// Server configs
export const PORT = getEnv('PORT', true, '4000');
export const HOST = getEnv('HOST', true, '0.0.0.0');
export const BASE_URL = `http://${HOST}:${PORT}`;

// Environment
export const NODE_ENV = (process.env.NODE_ENV || 'development') as 'development' | 'production';

// Paginate
export const ITEM_PER_PAGE = 48; // Chia hết cho tá để dễ phân layout

// File
export const PUBLIC_PATH = path.join(import.meta.dirname, '../../public');
