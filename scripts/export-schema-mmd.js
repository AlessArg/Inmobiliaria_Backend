require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function normalizeType(columnType) {
    return String(columnType)
        .toLowerCase()
        .replace(/\(/g, '_')
        .replace(/\)/g, '')
        .replace(/,/g, '_')
        .replace(/\s+/g, '_');
}

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
        ORDER BY TABLE_NAME
        `,
    );

    const [fkRows] = await conn.query(
        `
        SELECT
            TABLE_NAME,
            COLUMN_NAME,
            REFERENCED_TABLE_NAME,
            REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, COLUMN_NAME
        `,
    );

    const fkMap = new Map();
    for (const fk of fkRows) {
        const key = `${fk.TABLE_NAME}.${fk.COLUMN_NAME}`;
        fkMap.set(key, fk);
    }

    const lines = ['erDiagram'];

    for (const tableRow of tables) {
        const tableName = tableRow.TABLE_NAME;
        const [columns] = await conn.query(
            `
            SELECT
                COLUMN_NAME,
                COLUMN_TYPE,
                COLUMN_KEY
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
            `,
            [tableName],
        );

        lines.push(`  ${tableName.toUpperCase()} {`);

        for (const col of columns) {
            const type = normalizeType(col.COLUMN_TYPE);
            const tags = [];
            if (col.COLUMN_KEY === 'PRI') {
                tags.push('PK');
            }
            if (fkMap.has(`${tableName}.${col.COLUMN_NAME}`)) {
                tags.push('FK');
            }

            const suffix = tags.length > 0 ? ` ${tags.join(' ')}` : '';
            lines.push(`    ${type} ${col.COLUMN_NAME}${suffix}`);
        }

        lines.push('  }');
        lines.push('');
    }

    for (const fk of fkRows) {
        lines.push(
            `  ${fk.REFERENCED_TABLE_NAME.toUpperCase()} ||--o{ ${fk.TABLE_NAME.toUpperCase()} : ${fk.COLUMN_NAME}`,
        );
    }

    const outputPath = path.join(process.cwd(), 'schema.mmd');
    fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

    await conn.end();
    console.log('SCHEMA_MMD_UPDATED', outputPath);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
