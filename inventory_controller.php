<?php
/**
 * Inventory Controller
 *
 * This class extends the CRUDController to manage inventory-related operations
 * within the CaféManager application. It provides methods for updating stock levels,
 * retrieving low stock items, and performing other inventory management tasks.
 *
 * Key Features:
 * - **Database Table Management**: Utilizes the 'inventory' table for all operations.
 * - **Update Stock**: Updates the stock quantity for a specific inventory item based on
 *   the provided item ID and quantity.
 * - **Get Low Stock Items**: Retrieves a list of inventory items that are below a specified
 *   stock threshold, allowing for proactive inventory management.
 *
 * Usage:
 * To use this controller, instantiate it and call the desired methods for inventory management:
 *
 * ```php
 * $inventoryController = new InventoryController();
 * $inventoryController->updateStock($itemId, $quantity);
 * $lowStockItems = $inventoryController->getLowStockItems(10);
 * ```
 *
 * Error Handling:
 * This class includes error handling for database operations, returning a 500 HTTP response
 * code in case of exceptions.
 */
require_once '../crud_controller.php';

class InventoryController extends CRUDController {
    public function __construct() {
        parent::__construct('inventory');
    }

    public function updateStock($itemId, $quantity) {
        try {
            $item = $this->read($itemId);
            $newQuantity = ($item['quantity'] ?? 0) + $quantity;
            
            return $this->update($itemId, ['quantity' => $newQuantity]);
        } catch (Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function getLowStockItems($threshold) {
        try {
            $stmt = $this->db->prepare(
                "SELECT * FROM {$this->table} 
                WHERE quantity <= ? OR quantity <= alert_threshold"
            );
            $stmt->execute([$threshold]);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function recordStockAdjustment($itemId, $quantity, $reason) {
        try {
            $stmt = $this->db->prepare(
                "INSERT INTO inventory_adjustments 
                (item_id, quantity, reason, timestamp) 
                VALUES (?, ?, ?, NOW())"
            );
            $stmt->execute([$itemId, $quantity, $reason]);
            
            // Update the stock level
            $this->updateStock($itemId, $quantity);
            
            return [
                'success' => true,
                'adjustmentId' => $this->db->lastInsertId()
            ];
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function getStockHistory($itemId, $startDate = null, $endDate = null) {
        try {
            $params = [$itemId];
            $dateCondition = '';
            
            if ($startDate && $endDate) {
                $dateCondition = "AND timestamp BETWEEN ? AND ?";
                $params[] = $startDate;
                $params[] = $endDate;
            }
            
            $stmt = $this->db->prepare(
                "SELECT * FROM inventory_adjustments 
                WHERE item_id = ? $dateCondition 
                ORDER BY timestamp DESC"
            );
            $stmt->execute($params);
            
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function setAlertThreshold($itemId, $threshold) {
        return $this->update($itemId, ['alert_threshold' => $threshold]);
    }

    public function handleRequest($method, $params) {
        // Handle custom endpoints
        if ($method === 'GET') {
            if (isset($params['lowStock'])) {
                return $this->getLowStockItems($params['lowStock']);
            }
            if (isset($params['itemId'], $params['history'])) {
                return $this->getStockHistory(
                    $params['itemId'],
                    $params['startDate'] ?? null,
                    $params['endDate'] ?? null
                );
            }
        }

        if ($method === 'POST') {
            if (isset($params['itemId'], $params['quantity'], $params['reason'])) {
                return $this->recordStockAdjustment(
                    $params['itemId'],
                    $params['quantity'],
                    $params['reason']
                );
            }
        }

        if ($method === 'PUT') {
            if (isset($params['itemId'], $params['threshold'])) {
                return $this->setAlertThreshold(
                    $params['itemId'],
                    $params['threshold']
                );
            }
        }

        // Fall back to default CRUD operations
        return parent::handleRequest($method, $params);
    }
}
