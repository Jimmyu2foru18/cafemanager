<?php
/**
 * Authentication Class
 *
 * This class handles user authentication for the CaféManager application. It provides methods
 * for user login, registration, and password management, ensuring secure access to the application.
 *
 * Key Features:
 * - **Database Connection**: Establishes a connection to the database for user data retrieval.
 * - **Password Hashing**: Utilizes Argon2id for secure password hashing and verification.
 * - **Token Management**: Generates and validates authentication tokens for session management.
 * - **Role-Based Access**: Supports role-based access control to restrict user permissions.
 *
 * Usage:
 * To use this class, instantiate it and call the desired methods for authentication tasks:
 *
 * ```php
 * $auth = new Auth();
 * $auth->login('username', 'password');
 * ```
 *
 * Ensure that the database is properly configured and that the necessary dependencies are included.
 */
require_once 'config.php';
require_once 'database.php';

class Auth {
    private $db;
    private const HASH_ALGO = PASSWORD_ARGON2ID;
    private const TOKEN_EXPIRY = 3600; // 1 hour

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function login($username, $password) {
        try {
            $stmt = $this->db->prepare(
                "SELECT id, username, password_hash, role 
                FROM users 
                WHERE username = ? AND active = TRUE"
            );
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || !password_verify($password, $user['password_hash'])) {
                return ['error' => 'Invalid credentials'];
            }

            // Update last login
            $this->db->prepare(
                "UPDATE users SET last_login = NOW() WHERE id = ?"
            )->execute([$user['id']]);

            // Generate session token
            $token = $this->generateToken($user['id'], $user['role']);
            
            return [
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'role' => $user['role']
                ],
                'token' => $token
            ];
        } catch (PDOException $e) {
            return ['error' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function register($username, $password, $name, $email, $role = 'staff') {
        try {
            // Check if username or email exists
            $stmt = $this->db->prepare(
                "SELECT id FROM users WHERE username = ? OR email = ?"
            );
            $stmt->execute([$username, $email]);
            if ($stmt->fetch()) {
                return ['error' => 'Username or email already exists'];
            }

            // Create new user
            $stmt = $this->db->prepare(
                "INSERT INTO users (username, password_hash, name, email, role) 
                VALUES (?, ?, ?, ?, ?)"
            );
            $passwordHash = password_hash($password, self::HASH_ALGO);
            $stmt->execute([$username, $passwordHash, $name, $email, $role]);

            return [
                'success' => true,
                'userId' => $this->db->lastInsertId()
            ];
        } catch (PDOException $e) {
            return ['error' => 'Database error: ' . $e->getMessage()];
        }
    }

    private function generateToken($userId, $role) {
        $header = base64_encode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        $payload = base64_encode(json_encode([
            'sub' => $userId,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + self::TOKEN_EXPIRY
        ]));

        $signature = hash_hmac(
            'sha256',
            "$header.$payload",
            Config::get('jwt_secret'),
            true
        );
        $signature = base64_encode($signature);

        return "$header.$payload.$signature";
    }

    public function validateToken($token) {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return false;
            }

            [$header, $payload, $signature] = $parts;

            // Verify signature
            $expectedSignature = hash_hmac(
                'sha256',
                "$header.$payload",
                Config::get('jwt_secret'),
                true
            );
            $expectedSignature = base64_encode($expectedSignature);

            if (!hash_equals($signature, $expectedSignature)) {
                return false;
            }

            // Check expiration
            $payload = json_decode(base64_decode($payload), true);
            if ($payload['exp'] < time()) {
                return false;
            }

            return $payload;
        } catch (Exception $e) {
            return false;
        }
    }

    public function changePassword($userId, $currentPassword, $newPassword) {
        try {
            $stmt = $this->db->prepare(
                "SELECT password_hash FROM users WHERE id = ?"
            );
            $stmt->execute([$userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
                return ['error' => 'Invalid current password'];
            }

            $newHash = password_hash($newPassword, self::HASH_ALGO);
            $this->db->prepare(
                "UPDATE users SET password_hash = ? WHERE id = ?"
            )->execute([$newHash, $userId]);

            return ['success' => true];
        } catch (PDOException $e) {
            return ['error' => 'Database error: ' . $e->getMessage()];
        }
    }

    public function getUserById($userId) {
        try {
            $stmt = $this->db->prepare(
                "SELECT id, username, name, email, role, created_at, last_login 
                FROM users WHERE id = ?"
            );
            $stmt->execute([$userId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            return null;
        }
    }
}
