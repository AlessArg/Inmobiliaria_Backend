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

    const [columnRows] = await conn.query(
        `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'projects'
           AND COLUMN_NAME = 'project_construction_style'`,
    );

    const [fkRows] = await conn.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'projects'
           AND COLUMN_NAME = 'project_construction_style'
           AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );

    const [sampleRows] = await conn.query(
        `SELECT id_project, project_construction_style
         FROM projects
         ORDER BY id_project
         LIMIT 10`,
    );

    console.log('COLUMN', columnRows);
    console.log('FKS', fkRows);
    console.log('SAMPLE', sampleRows);

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
