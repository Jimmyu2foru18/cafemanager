<?php
/**
 * Authentication Test Suite
 *
 * This file contains a test suite for the authentication functionality of the CaféManager application.
 * It utilizes PHPUnit to validate the correctness of the authentication system, ensuring that all
 * features work as expected. The tests cover various scenarios including user registration, login,
 * token validation, and error handling.
 *
 * Key Features:
 * - **setUp()**: Initializes the test environment, creating necessary database tables and test users.
 * - **tearDown()**: Cleans up the test environment after tests are executed.
 * - **testRegister()**: Tests the user registration process.
 * - **testLogin()**: Validates the login functionality with correct credentials.
 * - **testInvalidLogin()**: Checks the handling of invalid login attempts.
 * - **testTokenValidation()**: Ensures that valid tokens are correctly validated.
 * - **testInvalidToken()**: Tests the response to invalid tokens.
 * - **testExpiredToken()**: Verifies the behavior when using expired tokens.
 * - **testChangePassword()**: Tests the functionality for changing user passwords.
 * - **testDuplicateRegistration()**: Ensures that duplicate user registrations are handled correctly.
 * - **testGetUserById()**: Validates the retrieval of user information by ID.
 *
 * Usage:
 * This test suite should be run using PHPUnit. Ensure that the database is properly configured
 * and that the necessary dependencies are installed before executing the tests.
 */

require_once '../vendor/autoload.php';
require_once '../config.php';
require_once '../auth.php';

use PHPUnit\Framework\TestCase;

class AuthTest extends TestCase {
    private $db;
    private $auth;
    private $testUser;

    protected function setUp(): void {
        // Use test database
        Config::set('db_name', 'cafemanager_test');
        Config::set('jwt_secret', 'test_secret_key');
        
        // Initialize database connection
        $this->db = Database::getInstance()->getConnection();
        
        // Create test tables
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('admin', 'manager', 'staff') NOT NULL,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP NULL,
                active BOOLEAN DEFAULT TRUE
            )
        ");
        
        // Initialize Auth
        $this->auth = new Auth();
        
        // Create test user
        $this->testUser = $this->auth->register(
            'testuser',
            'password123',
            'Test User',
            'test@example.com',
            'staff'
        );
    }

    protected function tearDown(): void {
        // Clean up test data
        $this->db->exec("DROP TABLE IF EXISTS users");
    }

    public function testRegister() {
        $result = $this->auth->register(
            'newuser',
            'password123',
            'New User',
            'new@example.com',
            'staff'
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('userId', $result);
    }

    public function testLogin() {
        $result = $this->auth->login('testuser', 'password123');

        $this->assertArrayHasKey('success', $result);
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('token', $result);
        $this->assertArrayHasKey('user', $result);
    }

    public function testInvalidLogin() {
        $result = $this->auth->login('testuser', 'wrongpassword');

        $this->assertArrayHasKey('error', $result);
    }

    public function testTokenValidation() {
        // Login to get token
        $login = $this->auth->login('testuser', 'password123');
        $token = $login['token'];

        // Validate token
        $payload = $this->auth->validateToken($token);

        $this->assertIsArray($payload);
        $this->assertArrayHasKey('sub', $payload);
        $this->assertArrayHasKey('role', $payload);
    }

    public function testInvalidToken() {
        $result = $this->auth->validateToken('invalid.token.here');
        $this->assertFalse($result);
    }

    public function testExpiredToken() {
        // Create an expired token
        $header = base64_encode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        $payload = base64_encode(json_encode([
            'sub' => 1,
            'role' => 'staff',
            'iat' => time() - 7200,
            'exp' => time() - 3600
        ]));

        $signature = base64_encode(hash_hmac(
            'sha256',
            "$header.$payload",
            Config::get('jwt_secret'),
            true
        ));

        $token = "$header.$payload.$signature";

        $result = $this->auth->validateToken($token);
        $this->assertFalse($result);
    }

    public function testChangePassword() {
        $userId = $this->testUser['userId'];
        
        $result = $this->auth->changePassword(
            $userId,
            'password123',
            'newpassword123'
        );

        $this->assertArrayHasKey('success', $result);
        $this->assertTrue($result['success']);

        // Verify new password works
        $login = $this->auth->login('testuser', 'newpassword123');
        $this->assertTrue($login['success']);
    }

    public function testDuplicateRegistration() {
        $result = $this->auth->register(
            'testuser',
            'password123',
            'Test User',
            'test@example.com',
            'staff'
        );

        $this->assertArrayHasKey('error', $result);
    }

    public function testGetUserById() {
        $userId = $this->testUser['userId'];
        $user = $this->auth->getUserById($userId);

        $this->assertIsArray($user);
        $this->assertEquals('testuser', $user['username']);
        $this->assertEquals('Test User', $user['name']);
        $this->assertEquals('test@example.com', $user['email']);
    }
}
