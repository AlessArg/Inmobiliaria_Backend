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
        `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_TYPE
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'projects'
           AND COLUMN_NAME IN ('project_city_location','project_municipality_location')
         ORDER BY ORDINAL_POSITION`,
    );

    const [projectCountRows] = await conn.query('SELECT COUNT(*) AS total FROM projects');

    const [cityValueCount] = await conn.query(
        `SELECT COUNT(DISTINCT TRIM(project_city_location)) AS distinct_cities
         FROM projects
         WHERE project_city_location IS NOT NULL AND TRIM(project_city_location) <> ''`,
    );

    const [municipalityValueCount] = await conn.query(
        `SELECT COUNT(DISTINCT TRIM(project_municipality_location)) AS distinct_municipalities
         FROM projects
         WHERE project_municipality_location IS NOT NULL AND TRIM(project_municipality_location) <> ''`,
    );

    const [unmappedCities] = await conn.query(
        `SELECT p.project_city_location, COUNT(*) AS uses
         FROM projects p
         LEFT JOIN cities c
           ON LOWER(TRIM(p.project_city_location)) = LOWER(TRIM(c.city_name))
         WHERE p.project_city_location IS NOT NULL
           AND TRIM(p.project_city_location) <> ''
           AND c.id_city IS NULL
         GROUP BY p.project_city_location
         ORDER BY uses DESC, p.project_city_location`,
    );

    const [unmappedMunicipalities] = await conn.query(
        `SELECT p.project_municipality_location, COUNT(*) AS uses
         FROM projects p
         LEFT JOIN municipalities m
           ON LOWER(TRIM(p.project_municipality_location)) = LOWER(TRIM(m.municipality_name))
         WHERE p.project_municipality_location IS NOT NULL
           AND TRIM(p.project_municipality_location) <> ''
           AND m.id_municipality IS NULL
         GROUP BY p.project_municipality_location
         ORDER BY uses DESC, p.project_municipality_location`,
    );

    const [ambiguousMunicipalityMatches] = await conn.query(
        `SELECT LOWER(TRIM(m.municipality_name)) AS municipality_key, COUNT(*) AS municipalities_with_same_name
         FROM municipalities m
         GROUP BY LOWER(TRIM(m.municipality_name))
         HAVING COUNT(*) > 1
         ORDER BY municipalities_with_same_name DESC, municipality_key`,
    );

    const [currentFks] = await conn.query(
        `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'projects'
           AND REFERENCED_TABLE_NAME IS NOT NULL`,
    );

    const [citySample] = await conn.query(
        `SELECT DISTINCT project_city_location AS city_value
         FROM projects
         WHERE project_city_location IS NOT NULL AND TRIM(project_city_location) <> ''
         ORDER BY city_value
         LIMIT 20`,
    );

    const [municipalitySample] = await conn.query(
        `SELECT DISTINCT project_municipality_location AS municipality_value
         FROM projects
         WHERE project_municipality_location IS NOT NULL AND TRIM(project_municipality_location) <> ''
         ORDER BY municipality_value
         LIMIT 20`,
    );

    console.log('PROJECT_COLS', projectCols);
    console.log('PROJECT_TOTAL_ROWS', projectCountRows[0]?.total ?? 0);
    console.log('DISTINCT_CITY_VALUES', cityValueCount[0]?.distinct_cities ?? 0);
    console.log('DISTINCT_MUNICIPALITY_VALUES', municipalityValueCount[0]?.distinct_municipalities ?? 0);
    console.log('UNMAPPED_CITIES_COUNT', unmappedCities.length);
    console.log('UNMAPPED_CITIES', unmappedCities);
    console.log('UNMAPPED_MUNICIPALITIES_COUNT', unmappedMunicipalities.length);
    console.log('UNMAPPED_MUNICIPALITIES', unmappedMunicipalities);
    console.log('AMBIGUOUS_MUNICIPALITY_NAMES_COUNT', ambiguousMunicipalityMatches.length);
    console.log('AMBIGUOUS_MUNICIPALITY_NAMES_SAMPLE', ambiguousMunicipalityMatches.slice(0, 20));
    console.log('CURRENT_PROJECT_FKS', currentFks);
    console.log('PROJECT_CITY_SAMPLE', citySample);
    console.log('PROJECT_MUNICIPALITY_SAMPLE', municipalitySample);

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
