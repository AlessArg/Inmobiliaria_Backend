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

        await conn.query(
            `UPDATE projects
             SET project_city_location = NULL,
                 project_municipality_location = NULL`,
        );

        await conn.query(
            `ALTER TABLE projects
             MODIFY COLUMN project_city_location INT NULL,
             MODIFY COLUMN project_municipality_location INT NULL`,
        );

        await conn.query(
            `ALTER TABLE projects
             ADD CONSTRAINT fk_projects_city_location
             FOREIGN KEY (project_city_location) REFERENCES cities(id_city)
             ON UPDATE CASCADE ON DELETE SET NULL,
             ADD CONSTRAINT fk_projects_municipality_location
             FOREIGN KEY (project_municipality_location) REFERENCES municipalities(id_municipality)
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
