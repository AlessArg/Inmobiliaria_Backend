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

    try {
        await conn.beginTransaction();

        const [existingFkRows] = await conn.query(
            `SELECT CONSTRAINT_NAME
             FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = 'projects'
               AND COLUMN_NAME = 'project_construction_style'
               AND REFERENCED_TABLE_NAME IS NOT NULL`,
        );

        for (const fk of existingFkRows) {
            await conn.query(
                `ALTER TABLE projects DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`,
            );
        }

        await conn.query(
            `UPDATE projects
             SET project_construction_style = NULL`,
        );

        await conn.query(
            `ALTER TABLE projects
             MODIFY COLUMN project_construction_style INT NULL`,
        );

        await conn.query(
            `ALTER TABLE projects
             ADD CONSTRAINT fk_projects_construction_style
             FOREIGN KEY (project_construction_style)
             REFERENCES construction_styles(id_construction_style)
             ON UPDATE CASCADE ON DELETE SET NULL`,
        );

        await conn.commit();
        console.log('MIGRATION_OK');
    } catch (error) {
        await conn.rollback();
        console.error('MIGRATION_ERROR', error.message);
        process.exitCode = 1;
    } finally {
        await conn.end();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
