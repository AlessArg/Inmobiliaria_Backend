require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT),
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        multipleStatements: false,
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

    let totalDeleted = 0;

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

        if (pkRows.length !== 1) {
            console.log(`SKIP ${tableName} unsupported primary key shape`);
            continue;
        }

        const pkColumn = pkRows[0].COLUMN_NAME;

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
            .filter((columnName) => columnName !== pkColumn);

        if (nonPkColumns.length === 0) {
            console.log(`DEDUPE ${tableName} deleted=0`);
            continue;
        }

        const equalsByAllColumns = nonPkColumns
            .map(
                (columnName) =>
                    `(t1.\`${columnName}\` <=> t2.\`${columnName}\`)`,
            )
            .join(' AND ');

        const sql = `
            DELETE t1
            FROM \`${tableName}\` t1
            INNER JOIN \`${tableName}\` t2
                ON t1.\`${pkColumn}\` > t2.\`${pkColumn}\`
               AND ${equalsByAllColumns}
        `;

        const [result] = await conn.query(sql);
        const deleted = result.affectedRows ?? 0;
        totalDeleted += deleted;
        console.log(`DEDUPE ${tableName} deleted=${deleted}`);
    }

    console.log(`DEDUPE_TOTAL deleted=${totalDeleted}`);
    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
