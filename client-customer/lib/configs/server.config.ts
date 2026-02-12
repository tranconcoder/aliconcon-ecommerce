import { checkEnv } from "../helpers/env.helper";

export const BACKEND_API_URL: string = checkEnv(process.env.NEXT_PUBLIC_API_URL, true);