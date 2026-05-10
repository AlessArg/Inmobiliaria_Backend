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

  const [columns] = await conn.query(`
    SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, COLUMN_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME IN ('teams','team_members','team_projects')
      AND COLUMN_NAME IN ('fecha_creacion','fecha_asignacion')
    ORDER BY TABLE_NAME, COLUMN_NAME
  `);

  console.log('DATE_COLUMNS', columns);

  await conn.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
