<?php
/**
 * Menu Controller
 *
 * This class extends the CRUDController to manage menu-related operations
 * within the CaféManager application. It provides methods for retrieving and
 * updating menu item information, including availability and pricing.
 *
 * Key Features:
 * - **Database Table Management**: Utilizes the 'menu_items' table for all operations.
 * - **Get Menu Items by Category**: Retrieves menu items based on their category.
 * - **Update Item Availability**: Allows updating the availability status of a specific
 *   menu item.
 * - **Update Item Price**: Enables updating the price of a specific menu item.
 * - **Get Available Items**: Fetches all menu items that are currently available.
 *
 * Usage:
 * To use this controller, instantiate it and call the desired methods for menu management:
 *
 * ```php
 * $menuController = new MenuController();
 * $availableItems = $menuController->getAvailableItems();
 * ```
 *
 * Error Handling:
 * This class includes error handling for database operations, returning appropriate HTTP response
 * codes in case of exceptions.
 */
require_once '../crud_controller.php';

class MenuController extends CRUDController {
    public function __construct() {
        parent::__construct('menu_items');
    }

    public function getByCategory($category) {
        return $this->list(['category' => $category]);
    }

    public function updateAvailability($itemId, $available) {
        return $this->update($itemId, ['available' => $available]);
    }

    public function updatePrice($itemId, $price) {
        return $this->update($itemId, ['price' => $price]);
    }

    public function getAvailableItems() {
        return $this->list(['available' => true]);
    }

    public function searchItems($query) {
        try {
            $stmt = $this->db->prepare(
                "SELECT * FROM {$this->table} 
                WHERE name LIKE ? OR description LIKE ?"
            );
            $searchTerm = "%$query%";
            $stmt->execute([$searchTerm, $searchTerm]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function handleRequest($method, $params) {
        // Handle custom endpoints
        if ($method === 'GET') {
            if (isset($params['category'])) {
                return $this->getByCategory($params['category']);
            }
            if (isset($params['available'])) {
                return $this->getAvailableItems();
            }
            if (isset($params['search'])) {
                return $this->searchItems($params['search']);
            }
        }

        if ($method === 'PUT') {
            if (isset($params['itemId'], $params['available'])) {
                return $this->updateAvailability(
                    $params['itemId'],
                    $params['available']
                );
            }
            if (isset($params['itemId'], $params['price'])) {
                return $this->updatePrice(
                    $params['itemId'],
                    $params['price']
                );
            }
        }

        // Fall back to default CRUD operations
        return parent::handleRequest($method, $params);
    }
}
