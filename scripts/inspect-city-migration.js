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

    const [projectCols] = await conn.query(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND COLUMN_NAME IN ('project_city_location','project_municipality_location') ORDER BY ORDINAL_POSITION",
    );

    const [citiesCols] = await conn.query(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cities' ORDER BY ORDINAL_POSITION",
    );

    const [municipalitiesCols] = await conn.query(
        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'municipalities' ORDER BY ORDINAL_POSITION",
    );

    const [projectCityDistinct] = await conn.query(
        'SELECT DISTINCT project_city_location AS value FROM projects ORDER BY project_city_location',
    );

    const [projectMunicipalityDistinct] = await conn.query(
        'SELECT DISTINCT project_municipality_location AS value FROM projects ORDER BY project_municipality_location',
    );

    const [citiesData] = await conn.query(
        'SELECT id_city, city_name FROM cities ORDER BY id_city',
    );

    const [municipalitiesData] = await conn.query(
        'SELECT id_municipality, municipality_name, id_city FROM municipalities ORDER BY id_municipality',
    );

    const [projectFks] = await conn.query(
        "SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'projects' AND REFERENCED_TABLE_NAME IS NOT NULL",
    );

    console.log('PROJECT_COLS', JSON.stringify(projectCols, null, 2));
    console.log('CITIES_COLS', JSON.stringify(citiesCols, null, 2));
    console.log('MUNICIPALITIES_COLS', JSON.stringify(municipalitiesCols, null, 2));
    console.log('PROJECT_CITY_DISTINCT', JSON.stringify(projectCityDistinct, null, 2));
    console.log('PROJECT_MUNICIPALITY_DISTINCT', JSON.stringify(projectMunicipalityDistinct, null, 2));
    console.log('CITIES_DATA', JSON.stringify(citiesData, null, 2));
    console.log('MUNICIPALITIES_DATA', JSON.stringify(municipalitiesData, null, 2));
    console.log('PROJECT_FKS', JSON.stringify(projectFks, null, 2));

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
