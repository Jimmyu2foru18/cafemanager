<?php
/**
 * Base CRUD Controller
 *
 * This abstract class provides a foundation for implementing basic Create, Read, Update,
 * and Delete (CRUD) operations for various entities within the CaféManager application.
 * It establishes a connection to the database and defines common methods that can be
 * utilized by derived controller classes.
 *
 * Key Features:
 * - **Database Connection**: Initializes a PDO connection to the database using credentials
 *   defined in the configuration file.
 * - **Table Management**: Accepts the name of the database table as a parameter for
 *   operations, allowing for flexible CRUD functionality across different entities.
 *
 * Usage:
 * To create a specific controller for an entity, extend this class and implement the
 * necessary methods for handling CRUD operations.
 *
 */
abstract class CRUDController {
    protected $db;
    protected $table;

    public function __construct($table) {
        require_once '../config.php';
        $this->db = new PDO(DB_DSN, DB_USER, DB_PASS);
        $this->db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->table = $table;
    }

    /**
     * Create a new entity
     * @param array $data Entity data
     * @return array Created entity
     */
    public function create($data) {
        try {
            $columns = implode(', ', array_keys($data));
            $values = implode(', ', array_fill(0, count($data), '?'));
            
            $stmt = $this->db->prepare("INSERT INTO {$this->table} ($columns) VALUES ($values)");
            $stmt->execute(array_values($data));
            
            $id = $this->db->lastInsertId();
            return $this->read($id);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Read an entity
     * @param int $id Entity ID
     * @return array Entity data
     */
    public function read($id) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE id = ?");
            $stmt->execute([$id]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Update an entity
     * @param int $id Entity ID
     * @param array $data Updated entity data
     * @return array Updated entity
     */
    public function update($id, $data) {
        try {
            $set = implode(', ', array_map(fn($k) => "$k = ?", array_keys($data)));
            
            $stmt = $this->db->prepare("UPDATE {$this->table} SET $set WHERE id = ?");
            $stmt->execute([...array_values($data), $id]);
            
            return $this->read($id);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Delete an entity
     * @param int $id Entity ID
     * @return array Operation result
     */
    public function delete($id) {
        try {
            $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE id = ?");
            $stmt->execute([$id]);
            
            return ['success' => true];
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * List entities with optional filters
     * @param array $filters Optional filters
     * @return array List of entities
     */
    public function list($filters = []) {
        try {
            $where = '';
            $params = [];
            
            if (!empty($filters)) {
                $conditions = [];
                foreach ($filters as $key => $value) {
                    $conditions[] = "$key = ?";
                    $params[] = $value;
                }
                $where = 'WHERE ' . implode(' AND ', $conditions);
            }
            
            $stmt = $this->db->prepare("SELECT * FROM {$this->table} $where");
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    /**
     * Handle API request
     * @param string $method HTTP method
     * @param array $params Request parameters
     * @return array Response data
     */
    public function handleRequest($method, $params) {
        switch ($method) {
            case 'GET':
                if (isset($params['id'])) {
                    return $this->read($params['id']);
                }
                return $this->list($params);
            
            case 'POST':
                return $this->create($params);
            
            case 'PUT':
                if (!isset($params['id'])) {
                    http_response_code(400);
                    return ['error' => 'ID is required for update'];
                }
                $id = $params['id'];
                unset($params['id']);
                return $this->update($id, $params);
            
            case 'DELETE':
                if (!isset($params['id'])) {
                    http_response_code(400);
                    return ['error' => 'ID is required for deletion'];
                }
                return $this->delete($params['id']);
            
            default:
                http_response_code(405);
                return ['error' => 'Method not allowed'];
        }
    }
}
