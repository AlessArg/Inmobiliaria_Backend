require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

function toDbmlType(columnType) {
    return String(columnType).toLowerCase();
}

function defaultClause(defaultValue) {
    if (defaultValue === null || defaultValue === undefined) {
        return '';
    }

    if (typeof defaultValue === 'number') {
        return `, default: ${defaultValue}`;
    }

    const asText = String(defaultValue);
    return `, default: \"${asText.replace(/\"/g, '\\\"')}\"`;
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

    const lines = [];

    for (const tableRow of tables) {
        const tableName = tableRow.TABLE_NAME;
        const [columns] = await conn.query(
            `
            SELECT
                COLUMN_NAME,
                COLUMN_TYPE,
                IS_NULLABLE,
                COLUMN_KEY,
                EXTRA,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
            `,
            [tableName],
        );

        lines.push(`Table ${tableName} {`);

        for (const col of columns) {
            const rules = [];
            if (col.COLUMN_KEY === 'PRI') {
                rules.push('pk');
            }
            if (String(col.EXTRA).toLowerCase().includes('auto_increment')) {
                rules.push('increment');
            }
            if (col.IS_NULLABLE === 'NO') {
                rules.push('not null');
            }

            const defaultRule = defaultClause(col.COLUMN_DEFAULT);
            const rulesText =
                rules.length > 0 || defaultRule
                    ? ` [${[...rules, defaultRule ? defaultRule.slice(2) : '']
                          .filter(Boolean)
                          .join(', ')}]`
                    : '';

            lines.push(
                `  ${col.COLUMN_NAME} ${toDbmlType(col.COLUMN_TYPE)}${rulesText}`,
            );
        }

        lines.push('}');
        lines.push('');
    }

    for (const fk of fkRows) {
        lines.push(
            `Ref: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} > ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`,
        );
    }

    const outputPath = path.join(process.cwd(), 'schema.dbml');
    fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');

    await conn.end();
    console.log('SCHEMA_DBML_UPDATED', outputPath);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
