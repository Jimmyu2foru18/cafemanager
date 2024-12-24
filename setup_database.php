<?php
/**
 * Database Setup Script
 *
 * This script is responsible for setting up the database for the CaféManager application.
 * It connects to the MySQL server, creates the necessary database, and imports the schema
 * to ensure that all required tables and structures are in place for the application to function.
 *
 * Key Features:
 * - **Database Connection**: Establishes a connection to the MySQL server using PDO,
 *   ensuring error handling is in place.
 * - **Database Creation**: Executes SQL commands to create the 'cafemanager' database
 *   if it does not already exist.
 * - **Schema Import**: Imports the database schema from an external SQL file to set up
 *   the required tables and initial data.
 *
 * Usage:
 * To run this script, execute it from the command line or include it in your application
 * setup process. Ensure that the MySQL server is running and accessible.
 *
 * Example:
 * ```bash
 * php setup_database.php
 * ```
 *
 * Note: Update the database connection parameters as necessary to match your environment
 * before executing this script.
 */

// Initial connection without database
try {
    $pdo = new PDO(
        "mysql:host=localhost",
        "root",
        "", 
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    
    echo "Connected to MySQL server\n";
    
    // Create database
    $createDbSql = file_get_contents(__DIR__ . '/../database/create_database.sql');
    $pdo->exec($createDbSql);
    echo "Created database 'cafemanager'\n";
    
    // Select the database
    $pdo->exec("USE cafemanager");
    echo "Selected database 'cafemanager'\n";
    
    // Import schema
    $schemaSql = file_get_contents(__DIR__ . '/../database/schema.sql');
    $pdo->exec($schemaSql);
    echo "Imported database schema\n";
    
    // Create an admin user
    $pdo->exec("
        INSERT INTO users (username, password_hash, role, name, email)
        VALUES (
            'admin',
            '" . password_hash('admin123', PASSWORD_ARGON2ID) . "',
            'admin',
            'System Administrator',
            'admin@cafemanager.local'
        )
    ");
    echo "Created admin user\n";
    
    echo "Database setup completed successfully!\n";
    
} catch (PDOException $e) {
    die("Database setup failed: " . $e->getMessage() . "\n");
}
