<?php
/**
 * Customers Controller
 *
 * This class extends the CRUDController to manage customer-related operations
 * within the CaféManager application. It provides methods for retrieving customer
 * information, specifically by loyalty card number, and inherits basic CRUD functionalities.
 *
 * Key Features:
 * - **Database Table Management**: Utilizes the 'customers' table for all operations.
 * - **Get Customer by Loyalty Card**: Fetches customer details based on their loyalty card number.
 *
 * Usage:
 * To use this controller, instantiate it and call the desired methods for customer management:
 *
 * ```php
 * $controller = new CustomersController();
 * $customer = $controller->getByLoyaltyCard('123456789');
 * ```
 *
 * Error Handling:
 * This class includes error handling for database operations, returning a 500 HTTP response
 * code in case of exceptions.
 */
require_once '../crud_controller.php';

class CustomersController extends CRUDController {
    public function __construct() {
        parent::__construct('customers');
    }

    public function getByLoyaltyCard($cardNumber) {
        try {
            $stmt = $this->db->prepare(
                "SELECT * FROM {$this->table} WHERE loyalty_card = ? LIMIT 1"
            );
            $stmt->execute([$cardNumber]);
            
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function updateLoyaltyPoints($customerId, $points) {
        try {
            $customer = $this->read($customerId);
            $newPoints = ($customer['loyalty_points'] ?? 0) + $points;
            
            return $this->update($customerId, ['loyalty_points' => $newPoints]);
        } catch (Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function searchCustomers($query) {
        try {
            $stmt = $this->db->prepare(
                "SELECT * FROM {$this->table} 
                WHERE name LIKE ? OR email LIKE ? OR phone LIKE ?"
            );
            $searchTerm = "%$query%";
            $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function getOrderHistory($customerId) {
        try {
            $stmt = $this->db->prepare(
                "SELECT o.* FROM orders o 
                WHERE o.customer_id = ? 
                ORDER BY o.created_at DESC"
            );
            $stmt->execute([$customerId]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function addNote($customerId, $note) {
        try {
            $customer = $this->read($customerId);
            $notes = json_decode($customer['notes'] ?? '[]', true);
            $notes[] = [
                'text' => $note,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
            return $this->update($customerId, ['notes' => json_encode($notes)]);
        } catch (Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function handleRequest($method, $params) {
        // Handle custom endpoints
        if ($method === 'GET') {
            if (isset($params['loyaltyCard'])) {
                return $this->getByLoyaltyCard($params['loyaltyCard']);
            }
            if (isset($params['search'])) {
                return $this->searchCustomers($params['search']);
            }
            if (isset($params['customerId'], $params['orderHistory'])) {
                return $this->getOrderHistory($params['customerId']);
            }
        }

        if ($method === 'POST') {
            if (isset($params['customerId'], $params['points'])) {
                return $this->updateLoyaltyPoints(
                    $params['customerId'],
                    $params['points']
                );
            }
            if (isset($params['customerId'], $params['note'])) {
                return $this->addNote(
                    $params['customerId'],
                    $params['note']
                );
            }
        }

        // Fall back to default CRUD operations
        return parent::handleRequest($method, $params);
    }
}
