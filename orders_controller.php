<?php
/**
 * Orders Controller
 *
 * This class extends the CRUDController to manage order-related operations
 * within the CaféManager application. It provides methods for retrieving and
 * updating order information, specifically for managing active and held orders.
 *
 * Key Features:
 * - **Database Table Management**: Utilizes the 'orders' table for all operations.
 * - **Get Active Orders**: Retrieves a list of orders that are currently active.
 * - **Get Held Orders**: Fetches orders that are on hold, allowing for later processing.
 * - **Complete Order**: Updates the status of a specific order to 'completed'.
 * - **Hold Order**: Updates the status of a specific order to 'held'.
 *
 * Usage:
 * To use this controller, instantiate it and call the desired methods for order management:
 *
 * ```php
 * $ordersController = new OrdersController();
 * $activeOrders = $ordersController->getActiveOrders();
 * ```
 *
 * Error Handling:
 * This class includes error handling for database operations, returning appropriate HTTP response
 * codes in case of exceptions.
 */
require_once '../crud_controller.php';

class OrdersController extends CRUDController {
    public function __construct() {
        parent::__construct('orders');
    }

    public function getActiveOrders() {
        return $this->list(['status' => 'active']);
    }

    public function getHeldOrders() {
        return $this->list(['status' => 'held']);
    }

    public function completeOrder($id) {
        return $this->update($id, ['status' => 'completed']);
    }

    public function holdOrder($id) {
        return $this->update($id, ['status' => 'held']);
    }

    public function addItem($orderId, $item) {
        try {
            $order = $this->read($orderId);
            $items = json_decode($order['items'], true) ?? [];
            $items[] = $item;
            
            return $this->update($orderId, ['items' => json_encode($items)]);
        } catch (Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function removeItem($orderId, $itemId) {
        try {
            $order = $this->read($orderId);
            $items = json_decode($order['items'], true) ?? [];
            $items = array_filter($items, fn($item) => $item['id'] !== $itemId);
            
            return $this->update($orderId, ['items' => json_encode(array_values($items))]);
        } catch (Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function updateItemQuantity($orderId, $itemId, $quantity) {
        try {
            $order = $this->read($orderId);
            $items = json_decode($order['items'], true) ?? [];
            
            foreach ($items as &$item) {
                if ($item['id'] === $itemId) {
                    $item['quantity'] = $quantity;
                    break;
                }
            }
            
            return $this->update($orderId, ['items' => json_encode($items)]);
        } catch (Exception $e) {
            http_response_code(500);
            return ['error' => $e->getMessage()];
        }
    }

    public function handleRequest($method, $params) {
        // Handle custom endpoints
        if ($method === 'GET') {
            if (isset($params['active'])) {
                return $this->getActiveOrders();
            }
            if (isset($params['held'])) {
                return $this->getHeldOrders();
            }
        }

        if ($method === 'POST') {
            if (isset($params['orderId'], $params['item'])) {
                return $this->addItem($params['orderId'], $params['item']);
            }
            if (isset($params['orderId'], $params['complete'])) {
                return $this->completeOrder($params['orderId']);
            }
            if (isset($params['orderId'], $params['hold'])) {
                return $this->holdOrder($params['orderId']);
            }
        }

        if ($method === 'PUT') {
            if (isset($params['orderId'], $params['itemId'], $params['quantity'])) {
                return $this->updateItemQuantity(
                    $params['orderId'],
                    $params['itemId'],
                    $params['quantity']
                );
            }
        }

        if ($method === 'DELETE') {
            if (isset($params['orderId'], $params['itemId'])) {
                return $this->removeItem($params['orderId'], $params['itemId']);
            }
        }

        // Fall back to default CRUD operations
        return parent::handleRequest($method, $params);
    }
}
