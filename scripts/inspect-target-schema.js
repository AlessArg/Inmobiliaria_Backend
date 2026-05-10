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

    const tables = [
        'leads',
        'lead_notes',
        'lead_documents',
        'marcajes',
        'attendance_event_types',
        'accounting_transactions',
        'accounting_receivables',
        'accounting_receivable_payments',
        'accounting_monthly_closes',
        'accounting_categories',
        'accounting_transaction_types',
        'accounting_transaction_statuses',
        'accounting_receivable_statuses',
        'accounting_payment_methods',
        'accounting_monthly_close_statuses',
        'hr_leave_requests',
        'hr_leave_request_statuses',
        'hr_payroll_runs',
        'hr_payroll_run_statuses',
        'hr_payroll_items',
        'hr_payroll_item_lines',
        'hr_payroll_concepts',
        'hr_payroll_concept_types',
        'hr_candidates',
        'hr_candidate_stage_history',
        'hr_recruitment_stages',
        'hr_recruitment_sources',
        'hr_positions',
        'hr_position_statuses',
        'hr_interviews',
        'hr_interview_types',
        'hr_interview_results',
    ];

    for (const tableName of tables) {
        const [rows] = await conn.query(
            `
            SELECT
                COLUMN_NAME,
                COLUMN_TYPE,
                IS_NULLABLE,
                COLUMN_DEFAULT,
                COLUMN_KEY,
                EXTRA
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
            ORDER BY ORDINAL_POSITION
            `,
            [tableName],
        );

        console.log(`TABLE ${tableName}`);
        console.log(JSON.stringify(rows));
    }

    await conn.end();
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
