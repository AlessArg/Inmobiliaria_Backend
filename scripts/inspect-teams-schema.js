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
        `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME IN ('teams', 'team_projects', 'team_members')
         ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    );

    const [fks] = await conn.query(
        `SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME IN ('teams', 'team_projects', 'team_members')
           AND REFERENCED_TABLE_NAME IS NOT NULL
         ORDER BY TABLE_NAME, COLUMN_NAME`,
    );

    const [indexes] = await conn.query(
        `SHOW INDEX FROM team_projects`,
    );

    const [indexesMembers] = await conn.query(
        `SHOW INDEX FROM team_members`,
    );

    const [counts] = await conn.query(
        `SELECT 'teams' AS table_name, COUNT(*) AS total FROM teams
         UNION ALL
         SELECT 'team_projects' AS table_name, COUNT(*) AS total FROM team_projects
         UNION ALL
         SELECT 'team_members' AS table_name, COUNT(*) AS total FROM team_members`,
    );

    console.log('COLUMNS', columns);
    console.log('FKS', fks);
    console.log('INDEXES_TEAM_PROJECTS', indexes);
    console.log('INDEXES_TEAM_MEMBERS', indexesMembers);
    console.log('COUNTS', counts);

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
