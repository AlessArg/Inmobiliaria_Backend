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

    const [rows] = await conn.query(
        `SELECT m.id_municipality, m.municipality_name, m.id_city, c.city_name
         FROM municipalities m
         JOIN cities c ON c.id_city = m.id_city
         WHERE m.id_city = 2 OR LOWER(m.municipality_name) LIKE '%jose%'
         ORDER BY m.id_city, m.municipality_name`,
    );

    console.log(rows);
    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
