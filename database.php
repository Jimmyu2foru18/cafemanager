<?php
/**
 * Database Class
 *
 * This class provides a singleton implementation for managing database connections
 * within the CaféManager application. It utilizes PDO for database interactions,
 * offering methods for executing queries and performing CRUD operations on the database.
 *
 * Key Features:
 * - **Singleton Pattern**: Ensures that only one instance of the database connection
 *   exists throughout the application, promoting efficient resource management.
 * - **Connection Management**: Handles the establishment and retrieval of the database
 *   connection.
 * - **Query Execution**: Provides methods for executing SQL queries with parameter binding,
 *   reducing the risk of SQL injection.
 * - **CRUD Operations**: Implements methods for inserting, updating, and deleting records
 *   in the database.
 * - **Transaction Management**: Supports beginning, committing, and rolling back transactions
 *   for complex operations.
 *
 * Usage:
 * To use this class, call `Database::getInstance()` to retrieve the singleton instance
 * and then use the available methods to interact with the database:
 *
 * ```php
 * $db = Database::getInstance();
 * $result = $db->query("SELECT * FROM users WHERE id = ?", [$userId]);
 * ```
 *
 * Ensure that the database configuration is properly set in the config file before
 * using this class.
 */
require_once 'config.php';

class Database {
    private static $instance = null;
    private $connection;

    private function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
                DB_USER,
                DB_PASS,
                array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
            );
        } catch (PDOException $e) {
            die("Connection failed: " . $e->getMessage());
        }
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->connection;
    }

    public function query($sql, $params = array()) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception("Query failed: " . $e->getMessage());
        }
    }

    public function insert($table, $data) {
        $fields = implode(',', array_keys($data));
        $values = implode(',', array_fill(0, count($data), '?'));
        $sql = "INSERT INTO $table ($fields) VALUES ($values)";
        
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute(array_values($data));
            return $this->connection->lastInsertId();
        } catch (PDOException $e) {
            throw new Exception("Insert failed: " . $e->getMessage());
        }
    }

    public function update($table, $data, $where) {
        $fields = array();
        foreach ($data as $key => $value) {
            $fields[] = "$key = ?";
        }
        $fields = implode(',', $fields);
        
        $whereClause = array();
        foreach ($where as $key => $value) {
            $whereClause[] = "$key = ?";
        }
        $whereClause = implode(' AND ', $whereClause);
        
        $sql = "UPDATE $table SET $fields WHERE $whereClause";
        
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute(array_merge(array_values($data), array_values($where)));
            return $stmt->rowCount();
        } catch (PDOException $e) {
            throw new Exception("Update failed: " . $e->getMessage());
        }
    }

    public function delete($table, $where) {
        $whereClause = array();
        foreach ($where as $key => $value) {
            $whereClause[] = "$key = ?";
        }
        $whereClause = implode(' AND ', $whereClause);
        
        $sql = "DELETE FROM $table WHERE $whereClause";
        
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute(array_values($where));
            return $stmt->rowCount();
        } catch (PDOException $e) {
            throw new Exception("Delete failed: " . $e->getMessage());
        }
    }

    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }

    public function commit() {
        return $this->connection->commit();
    }

    public function rollback() {
        return $this->connection->rollBack();
    }
}
