require("dotenv").config({ path: ".env.local" });
const mysql = require("mysql2/promise");

async function setupDatabase() {
  console.log("Connecting to MySQL...");

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "veritrue_db",
    });

    console.log(`Connected to database: ${process.env.DB_NAME}`);

    // Create sequence for user_id to simulate UUIDs or just use auto increment
    console.log("Creating 'users' table...");
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ 'users' table created successfully.");

    console.log(
      "Creating 'analysis_history' table (optional, for future use)...",
    );
    await connection.query(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        content_type ENUM('text', 'image', 'video', 'url') NOT NULL,
        content_preview TEXT,
        truth_score INT NOT NULL,
        verdict VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("✓ 'analysis_history' table created successfully.");

    await connection.end();
    console.log("Database setup complete!");
    process.exit(0);
  } catch (error) {
    console.error("Failed to set up database:", error);
    process.exit(1);
  }
}

setupDatabase();
