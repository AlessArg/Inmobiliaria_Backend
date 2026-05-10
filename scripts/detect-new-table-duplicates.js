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

    const [tables] = await conn.query(
        `
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND (
            TABLE_NAME LIKE 'accounting\\_%' ESCAPE '\\\\'
            OR TABLE_NAME LIKE 'hr\\_%' ESCAPE '\\\\'
            OR TABLE_NAME = 'attendance_event_types'
          )
        ORDER BY TABLE_NAME
        `,
    );

    for (const tableRow of tables) {
        const tableName = tableRow.TABLE_NAME;

        const [pkRows] = await conn.query(
            `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_KEY = 'PRI'
            ORDER BY ORDINAL_POSITION
            `,
            [tableName],
        );

        const primaryKeys = new Set(pkRows.map((row) => row.COLUMN_NAME));

        const [columnRows] = await conn.query(
            `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
            `,
            [tableName],
        );

        const nonPkColumns = columnRows
            .map((row) => row.COLUMN_NAME)
            .filter((columnName) => !primaryKeys.has(columnName));

        if (nonPkColumns.length === 0) {
            console.log(`DUP_EXACT ${tableName} groups=0`);
            continue;
        }

        const columnList = nonPkColumns.map((columnName) => `\`${columnName}\``).join(', ');

        const [duplicateGroupRows] = await conn.query(
            `
            SELECT COUNT(*) AS duplicate_groups
            FROM (
                SELECT ${columnList}, COUNT(*) AS items
                FROM \`${tableName}\`
                GROUP BY ${columnList}
                HAVING COUNT(*) > 1
            ) AS duplicate_groups
            `,
        );

        const duplicateGroups = duplicateGroupRows[0]?.duplicate_groups ?? 0;
        console.log(`DUP_EXACT ${tableName} groups=${duplicateGroups}`);
    }

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
