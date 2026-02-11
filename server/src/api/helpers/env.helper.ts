/**
 * Get an environment variable.
 * @param key The environment variable key.
 * @param isRequired Whether the variable is required. Defaults to false.
 * @param defaultValue The default value if not found and not required. Defaults to "".
 * @returns The value of the environment variable or the default value.
 * @throws Error if the variable is required but not found.
 */
export const getEnv = (key: string, isRequired: boolean = false, defaultValue: string = ""): string => {
    const value = process.env[key];

    if (!value && isRequired) {
        throw new Error(`Environment variable ${key} is required but not found.`);
    }

    return value || defaultValue;
};
