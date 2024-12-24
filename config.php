<?php
/**
 * Configuration Class
 *
 * This class handles the configuration settings for the CaféManager application.
 * It contains static properties to store database connection details, authentication
 * settings, WebSocket configuration, and other application-specific settings.
 *
 * Key Configuration Options:
 * - **Database Configuration**: 
 *   - `db_host`: The hostname of the database server (default: 'localhost').
 *   - `db_name`: The name of the database to connect to (default: 'cafemanager').
 *   - `db_user`: The username for database access (default: 'root').
 *   - `db_pass`: The password for the database user (default: '').
 *   - `db_charset`: The character set for the database connection (default: 'utf8mb4').
 *
 * - **Authentication Settings**:
 *   - `jwt_secret`: The secret key used for signing JSON Web Tokens (change in production).
 *   - `jwt_expiry`: The expiration time for JWT tokens in seconds (default: 3600 seconds).
 *   - `password_min_length`: The minimum length for user passwords (default: 8).
 *
 * - **WebSocket Configuration**:
 *   - `websocket_host`: The hostname for the WebSocket server (default: 'localhost').
 *   - `websocket_port`: The port for the WebSocket server (default: 8080).
 *   - `websocket_secure`: Indicates whether to use a secure WebSocket connection (default: false).
 *
 * - **Application Settings**:
 *   - Additional application-specific settings can be added here.
 *
 * Usage:
 * This class should be used to access configuration settings throughout the application.
 * Ensure that sensitive information, such as database credentials and JWT secrets, is
 * properly secured and not exposed in public repositories.
 */

class Config {
    private static $config = [
        // Database configuration
        'db_host' => 'localhost',
        'db_name' => 'cafemanager',
        'db_user' => 'root',
        'db_pass' => '',
        'db_charset' => 'utf8mb4',

        // Authentication
        'jwt_secret' => 'your-secret-key-here', // Change in production
        'jwt_expiry' => 3600, // 1 hour
        'password_min_length' => 8,

        // WebSocket
        'websocket_host' => 'localhost',
        'websocket_port' => 8080,
        'websocket_secure' => false,

        // Application
        'app_name' => 'CaféManager Pro',
        'app_version' => '1.0.0',
        'debug_mode' => true, // Set to false in production
        'timezone' => 'America/New_York',
        'locale' => 'en_US',

        // Security
        'cors_allowed_origins' => ['http://localhost:8080'],
        'max_login_attempts' => 5,
        'login_lockout_duration' => 900, // 15 minutes
        'session_lifetime' => 86400, // 24 hours

        // File uploads
        'upload_max_size' => 5242880, // 5MB
        'allowed_image_types' => ['image/jpeg', 'image/png', 'image/gif'],
        'upload_path' => '/uploads',

        // Cache
        'cache_enabled' => true,
        'cache_duration' => 3600,
        'cache_path' => '/cache',

        // Logging
        'log_enabled' => true,
        'log_level' => 'warning', // debug, info, warning, error
        'log_path' => '/logs',

        // Email
        'smtp_host' => 'smtp.example.com',
        'smtp_port' => 587,
        'smtp_secure' => 'tls',
        'smtp_username' => 'your-email@example.com',
        'smtp_password' => 'your-password',
        'mail_from' => 'noreply@cafemanager.com',
        'mail_from_name' => 'CaféManager Pro'
    ];

    public static function get($key) {
        return self::$config[$key] ?? null;
    }

    public static function set($key, $value) {
        self::$config[$key] = $value;
    }

    public static function load($file) {
        if (file_exists($file)) {
            $config = require $file;
            self::$config = array_merge(self::$config, $config);
        }
    }

    public static function isDevelopment() {
        return self::$config['debug_mode'] === true;
    }

    public static function getDbConfig() {
        return [
            'host' => self::$config['db_host'],
            'name' => self::$config['db_name'],
            'user' => self::$config['db_user'],
            'pass' => self::$config['db_pass'],
            'charset' => self::$config['db_charset']
        ];
    }

    public static function getWebSocketUrl() {
        $protocol = self::$config['websocket_secure'] ? 'wss' : 'ws';
        $host = self::$config['websocket_host'];
        $port = self::$config['websocket_port'];
        return "{$protocol}://{$host}:{$port}";
    }
}

// Set timezone
date_default_timezone_set(Config::get('timezone'));

// Session configuration
session_start();
ini_set('session.gc_maxlifetime', Config::get('session_lifetime'));
ini_set('session.cookie_lifetime', Config::get('session_lifetime'));

// Load required files
require_once 'database.php';
require_once 'auth.php';
