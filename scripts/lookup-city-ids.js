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

    const [escCity] = await conn.query(
        "SELECT id_city, city_name FROM cities WHERE LOWER(TRIM(city_name)) = 'escuintla'",
    );

    const [municipalities] = await conn.query(
        `SELECT id_municipality, municipality_name, id_city
         FROM municipalities
         WHERE LOWER(TRIM(municipality_name)) IN (
            'puerto san jose',
            'puerto san josé',
            'escuintla',
            'mixco',
            'villa nueva',
            'amatitlan'
         )
         ORDER BY municipality_name`,
    );

    console.log('ESCUINTLA_CITY', escCity);
    console.log('TARGET_MUNICIPALITIES', municipalities);

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
