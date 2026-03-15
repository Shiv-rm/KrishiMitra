import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// Connect using the connection string from .env
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Initialize tables
const initializeDB = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to the PostgreSQL database.');

        // Create Users Table (SERIAL instead of AUTOINCREMENT)
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                phone VARCHAR(50) UNIQUE NOT NULL,
                state VARCHAR(100) NOT NULL,
                district VARCHAR(100) NOT NULL,
                village VARCHAR(255),
                land_size REAL,
                land_unit VARCHAR(50),
                crop_type VARCHAR(100),
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create Queries Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS queries (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                lat REAL,
                lon REAL,
                recommended_crop VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `);

        client.release();
    } catch (err) {
        console.error('Error initializing database:', err.stack);
    }
};

// initializeDB();

// Export the pool so other files can run queries via db.query()
export { pool, initializeDB };
export default pool;
