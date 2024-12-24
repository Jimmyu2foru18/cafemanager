<?php
/**
 * Authentication Middleware
 *
 * This middleware is responsible for managing user authentication and authorization
 * within the CaféManager application. It ensures that only authenticated users can
 * access protected routes and resources, implementing various security measures.
 *
 * Key Features:
 * - **JWT Token Validation**: Validates JSON Web Tokens to ensure that users are authenticated.
 * - **Role-Based Access Control**: Implements access controls based on user roles, allowing
 *   or denying access to specific resources.
 * - **CSRF Protection**: Provides protection against Cross-Site Request Forgery attacks to
 *   enhance application security.
 * - **Session Management**: Manages user sessions to maintain authentication state across
 *   requests.
 *
 * Usage:
 * This middleware should be applied to routes that require authentication. It will check
 * for a valid JWT token in the request headers and verify the user's role before granting
 * access to the requested resource.
 */

require_once 'config.php';
require_once 'vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthMiddleware {
    private $config;
    private $excludedPaths;
    
    /**
     * Initialize the middleware
     * @param array $config Configuration options
     */
    public function __construct($config = []) {
        $this->config = array_merge([
            'jwt_secret' => getenv('JWT_SECRET'),
            'jwt_algorithm' => 'HS256',
            'session_lifetime' => 3600,
            'csrf_token_length' => 32
        ], $config);
        
        $this->excludedPaths = [
            '/login',
            '/register',
            '/forgot-password'
        ];
    }
    
    /**
     * Handle incoming request
     * @param string $path Request path
     * @return bool|array False if unauthorized, user data if authorized
     */
    public function handle($path) {
        // Skip authentication for excluded paths
        if (in_array($path, $this->excludedPaths)) {
            return true;
        }
        
        // Start session if not already started
        if (session_status() === PHP_SESSION_NONE) {
            session_start([
                'cookie_httponly' => true,
                'cookie_secure' => true,
                'cookie_samesite' => 'Strict'
            ]);
        }
        
        // Verify CSRF token for POST/PUT/DELETE requests
        if ($this->isStateChangingMethod()) {
            if (!$this->validateCSRFToken()) {
                http_response_code(403);
                echo json_encode(['error' => 'Invalid CSRF token']);
                exit;
            }
        }
        
        // Validate JWT token
        $token = $this->getBearerToken();
        if (!$token) {
            return false;
        }
        
        try {
            $payload = JWT::decode($token, new Key($this->config['jwt_secret'], $this->config['jwt_algorithm']));
            
            // Verify token expiration
            if ($payload->exp < time()) {
                return false;
            }
            
            // Refresh token if needed
            if ($this->shouldRefreshToken($payload->exp)) {
                $this->refreshToken($payload);
            }
            
            return (array) $payload;
        } catch (Exception $e) {
            error_log('JWT validation error: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Generate CSRF token
     * @return string Generated token
     */
    public function generateCSRFToken() {
        $token = bin2hex(random_bytes($this->config['csrf_token_length']));
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_token_time'] = time();
        return $token;
    }
    
    /**
     * Validate CSRF token
     * @return bool True if valid, false otherwise
     */
    public function validateCSRFToken() {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
        
        if (!$token || !isset($_SESSION['csrf_token'])) {
            return false;
        }
        
        // Verify token age
        if (time() - $_SESSION['csrf_token_time'] > $this->config['session_lifetime']) {
            unset($_SESSION['csrf_token']);
            unset($_SESSION['csrf_token_time']);
            return false;
        }
        
        // Constant-time comparison
        return hash_equals($_SESSION['csrf_token'], $token);
    }
    
    /**
     * Check if request method changes state
     * @return bool True if method changes state
     */
    private function isStateChangingMethod() {
        return in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'DELETE', 'PATCH']);
    }
    
    /**
     * Get bearer token from headers
     * @return string|null Token or null if not found
     */
    private function getBearerToken() {
        $headers = getallheaders();
        $auth = $headers['Authorization'] ?? '';
        
        if (preg_match('/Bearer\s+(.*)$/i', $auth, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    /**
     * Check if token should be refreshed
     * @param int $expiration Token expiration timestamp
     * @return bool True if should refresh
     */
    private function shouldRefreshToken($expiration) {
        // Refresh if less than 15 minutes remaining
        return ($expiration - time()) < 900;
    }
    
    /**
     * Refresh JWT token
     * @param object $payload Current token payload
     */
    private function refreshToken($payload) {
        $newPayload = [
            'sub' => $payload->sub,
            'role' => $payload->role,
            'iat' => time(),
            'exp' => time() + $this->config['session_lifetime']
        ];
        
        $token = JWT::encode($newPayload, $this->config['jwt_secret'], $this->config['jwt_algorithm']);
        
        header('X-New-Token: ' . $token);
    }
    
    /**
     * Check if user has required role
     * @param array $user User data
     * @param string|array $requiredRoles Required role(s)
     * @return bool True if authorized
     */
    public function checkRole($user, $requiredRoles) {
        if (!is_array($requiredRoles)) {
            $requiredRoles = [$requiredRoles];
        }
        
        return in_array($user['role'], $requiredRoles);
    }
    
    /**
     * Clear session data
     */
    public function clearSession() {
        session_unset();
        session_destroy();
        setcookie(session_name(), '', time() - 3600, '/');
    }
}
