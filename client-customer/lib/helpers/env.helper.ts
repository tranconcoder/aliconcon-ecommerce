/**
 * Validates and returns an environment variable value.
 * @param value The value of the environment variable (accessed via process.env.KEY).
 * @param isRequired Whether the variable is required. Defaults to false.
 * @param defaultValue The default value if not found and not required. Defaults to "".
 * @returns The value of the environment variable or the default value.
 * @throws Error if the variable is required but not found.
 */
export const checkEnv = (value: string | undefined, isRequired: boolean = false, defaultValue: string = ""): string => {
    if (!value && isRequired) {
        throw new Error("Environment variable is required but not found.");
    }

    return value || defaultValue;
};


