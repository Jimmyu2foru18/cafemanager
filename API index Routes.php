<?php
/*
 * API Index Routes
 *
 * This file serves as the central routing mechanism for the API of the CaféManager application.
 * It handles incoming requests and directs them to the appropriate controller based on the 
 * requested resource. The API supports various operations related to orders, menu items, 
 * customers, inventory, and reports.
 *
 * Key Features:
 * - **CORS Support**: Enables Cross-Origin Resource Sharing (CORS) for development purposes,
 *   allowing requests from any domain.
 * - **JSON Response**: Sets the content type to application/json for all responses, ensuring
 *   that clients receive data in a standard format.
 * - **Dynamic Controller Loading**: Uses a switch statement to instantiate the correct controller
 *   based on the requested resource, facilitating modular and organized code.
 *
 * Usage:
 * This file should be included in the main API entry point. Ensure that the appropriate 
 * controller classes are defined and available for instantiation.
 *
 * Example:
 * ```php
 * // Example of how to use this routing mechanism
 * $controllerName = 'orders'; // This would typically come from the request
 * include 'API index Routes.php';
 * ```
 */
header('Content-Type: application/json');

// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Load controllers
require_once 'controllers/orders_controller.php';
require_once 'controllers/menu_controller.php';
require_once 'controllers/customers_controller.php';
require_once 'controllers/inventory_controller.php';
require_once 'controllers/reports_controller.php';

// Parse the request
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$uri = explode('/', trim($uri, '/'));

// The first segment after 'api' is the controller name
$controllerName = $uri[1] ?? '';

// Get request method and parameters
$method = $_SERVER['REQUEST_METHOD'];
$params = [];

// Merge query parameters and request body
parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
if (in_array($method, ['POST', 'PUT'])) {
    $json = file_get_contents('php://input');
    if ($json) {
        $params = array_merge($params, json_decode($json, true) ?? []);
    }
}

// Route to appropriate controller
try {
    $controller = null;
    
    switch ($controllerName) {
        case 'orders':
            $controller = new OrdersController();
            break;
        
        case 'menu':
            $controller = new MenuController();
            break;
        
        case 'customers':
            $controller = new CustomersController();
            break;
        
        case 'inventory':
            $controller = new InventoryController();
            break;
        
        case 'reports':
            $controller = new ReportsController();
            break;
        
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Invalid endpoint']);
            exit;
    }
    
    if ($controllerName === 'reports') {
        switch ($uri[2] ?? '') {
            case 'inventory':
                $result = $controller->handleRequest('GET', ['action' => 'inventory']);
                break;
            
            case 'transactions':
                $result = $controller->handleRequest('GET', ['action' => 'transactions']);
                break;
            
            default:
                http_response_code(404);
                echo json_encode(['error' => 'Invalid report endpoint']);
                exit;
        }
    } else {
        $result = $controller->handleRequest($method, $params);
    }
    
    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
