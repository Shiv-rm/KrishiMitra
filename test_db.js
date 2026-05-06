import { pool } from './backend/database/pdb.js';
(async () => {
    const res = await pool.query("SELECT id, full_name, phone, telegram_chat_id, crop_type, state, district, village FROM users ORDER BY id");
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
})();
