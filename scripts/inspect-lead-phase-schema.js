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

  const [leadCols] = await conn.query(`
    SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads'
    ORDER BY ORDINAL_POSITION
  `);

  const [historyCols] = await conn.query(`
    SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'lead_phase_history'
    ORDER BY ORDINAL_POSITION
  `);

  const [viewingsCols] = await conn.query(`
    SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'viewings'
    ORDER BY ORDINAL_POSITION
  `);

  const [phaseRows] = await conn.query(`
    SELECT * FROM lead_phases ORDER BY 1
  `);

  console.log('LEADS_COLS', leadCols);
  console.log('LEAD_PHASE_HISTORY_COLS', historyCols);
  console.log('VIEWINGS_COLS', viewingsCols);
  console.log('LEAD_PHASES', phaseRows);

  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
