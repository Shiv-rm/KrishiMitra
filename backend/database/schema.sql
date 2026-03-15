-- Create the database
-- Note: If the database already exists, this line will throw a warning/error that you can safely ignore.
CREATE DATABASE krishimitra;

-- Connect to the newly created database (This is a psql specific command)
\c krishimitra;

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    village VARCHAR(255),
    land_size REAL,
    land_unit VARCHAR(50),
    crop_type VARCHAR(100),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create queries table (Crop Recommendations)
CREATE TABLE IF NOT EXISTS queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    lat REAL,
    lon REAL,
    recommended_crop VARCHAR(255),
    confidence_score REAL,             
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Create soil_reports table (Highly Recommended)
CREATE TABLE IF NOT EXISTS soil_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    nitrogen_level REAL,
    phosphorus_level REAL,
    potassium_level REAL,
    ph_level REAL,
    rainfall REAL,
    temperature REAL,
    humidity REAL,
    report_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 4. Create market_trends table (Optional for tracking prices)
CREATE TABLE IF NOT EXISTS market_trends (
    id SERIAL PRIMARY KEY,
    crop_name VARCHAR(100) NOT NULL,
    price_per_quintal REAL NOT NULL,
    state VARCHAR(100),
    market_name VARCHAR(255),
    trend VARCHAR(50),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
