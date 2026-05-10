require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    const [columns] = await conn.query(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'projects'
           AND COLUMN_NAME IN ('project_city_location', 'project_municipality_location')
         ORDER BY COLUMN_NAME`,
    );

    const [fks] = await conn.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'projects'
           AND COLUMN_NAME IN ('project_city_location', 'project_municipality_location')
           AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY COLUMN_NAME`,
    );

    const [sample] = await conn.query(
        `SELECT id_project, project_city_location, project_municipality_location
         FROM projects
         ORDER BY id_project
         LIMIT 10`,
    );

    console.log('COLUMNS', columns);
    console.log('FKS', fks);
    console.log('SAMPLE', sample);

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
