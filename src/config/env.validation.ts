type EnvRecord = Record<string, string>;

const requiredEnvKeys = [
    'PORT',
    'BACKEND_API_KEY',
    'MYSQL_HOST',
    'MYSQL_PORT',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
    'EMPLOYEE_PASSWORD_SECRET',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_WEB_API_KEY',
] as const;

export function validateEnv(config: Record<string, unknown>) {
    const missingKeys = requiredEnvKeys.filter((key) => {
        const value = config[key];
        return typeof value !== 'string' || value.trim().length === 0;
    });

    if (missingKeys.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingKeys.join(', ')}`,
        );
    }

    const env = config as EnvRecord;

    const port = Number(env.PORT);
    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        throw new Error('PORT must be a valid integer between 1 and 65535');
    }

    const mysqlPort = Number(env.MYSQL_PORT);
    if (!Number.isInteger(mysqlPort) || mysqlPort <= 0 || mysqlPort > 65535) {
        throw new Error(
            'MYSQL_PORT must be a valid integer between 1 and 65535',
        );
    }

    return config;
}
