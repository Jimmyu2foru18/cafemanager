<?php
/**
 * Point of Sale (POS) Interface
 *
 * This file serves as the main interface for the Point of Sale (POS) system within
 * the CaféManager application. It provides a modern, responsive user interface for
 * managing orders, processing payments, and displaying real-time updates to users.
 *
 * Key Features:
 * - **Real-Time Order Management**: Allows staff to manage customer orders as they are placed,
 *   ensuring up-to-date information is always available.
 * - **Menu Item Selection and Customization**: Facilitates the selection and customization of
 *   menu items, enhancing the customer experience.
 * - **Payment Processing**: Integrates with the payment gateway to handle transactions securely.
 * - **Order Status Tracking**: Provides visibility into the status of orders, allowing for
 *   efficient service and customer communication.
 * - **Customer Management**: Manages customer information and interactions, improving service
 *   delivery and customer satisfaction.
 *
 * Usage:
 * This interface should be included in the main application flow to provide users with
 * access to POS functionalities. Ensure that all necessary scripts and styles are loaded
 * for proper functionality.
 *
 * Note: The application should be configured with the appropriate database and services
 * before deploying this interface.
 */

require_once 'config.php';
require_once 'auth_middleware.php';
require_once 'api/controllers/orders_controller.php';
require_once 'api/controllers/menu_controller.php';

// Ensure user is authenticated
AuthMiddleware::requireAuth(['staff', 'manager', 'admin']);

// Initialize controllers
$ordersController = new OrdersController();
$menuController = new MenuController();

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo Config::get('app_name'); ?> - POS System</title>
    
    <!-- Styles -->
    <link rel="stylesheet" href="public/css/main.css">
    <link rel="stylesheet" href="public/css/pos.css">
    
    <!-- Third-party libraries -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
</head>
<body>
    <!-- Header Section -->
    <header class="pos-header">
        <div class="header-left">
            <h1><?php echo Config::get('app_name'); ?></h1>
            <span class="user-info">
                Welcome, <?php echo htmlspecialchars($_SESSION['user_name']); ?>
            </span>
        </div>
        <div class="header-right">
            <div class="time"><?php echo date('Y-m-d H:i:s'); ?></div>
            <button id="logoutBtn" class="btn btn-danger">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    </header>

    <!-- Main Content -->
    <main class="pos-container">
        <!-- Menu Section -->
        <section class="menu-section">
            <div class="category-filters">
                <?php
                $categories = $menuController->getCategories();
                foreach ($categories as $category) {
                    echo '<button class="category-btn" data-category="' . 
                         htmlspecialchars($category) . '">' . 
                         htmlspecialchars($category) . '</button>';
                }
                ?>
            </div>
            <div class="menu-items" id="menuItems">
                <!-- Menu items will be loaded dynamically -->
            </div>
        </section>

        <!-- Order Section -->
        <section class="order-section">
            <div class="order-header">
                <h2>Current Order</h2>
                <div class="order-controls">
                    <button id="newOrderBtn" class="btn btn-primary">
                        <i class="fas fa-plus"></i> New Order
                    </button>
                    <button id="holdOrderBtn" class="btn btn-secondary">
                        <i class="fas fa-pause"></i> Hold
                    </button>
                </div>
            </div>
            
            <div class="order-items" id="orderItems">
                <!-- Order items will be displayed here -->
            </div>

            <!-- Order Summary -->
            <div class="order-summary">
                <div class="summary-row">
                    <span>Subtotal:</span>
                    <span id="subtotal">$0.00</span>
                </div>
                <div class="summary-row">
                    <span>Tax (<?php echo Config::get('tax_rate'); ?>%):</span>
                    <span id="tax">$0.00</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span id="total">$0.00</span>
                </div>
            </div>

            <!-- Payment Section -->
            <div class="payment-section">
                <button id="paymentBtn" class="btn btn-success btn-large">
                    <i class="fas fa-credit-card"></i> Process Payment
                </button>
                <button id="cancelOrderBtn" class="btn btn-danger">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </section>

        <!-- Customer Section -->
        <section class="customer-section">
            <div class="customer-search">
                <input type="text" id="customerSearch" 
                       placeholder="Search customer...">
                <button id="addCustomerBtn" class="btn btn-primary">
                    <i class="fas fa-user-plus"></i>
                </button>
            </div>
            <div class="customer-info" id="customerInfo">
                <!-- Customer information will be displayed here -->
            </div>
        </section>
    </main>

    <!-- Modals -->
    <!-- Payment Modal -->
    <div id="paymentModal" class="modal">
        <div class="modal-content">
            <h2>Payment</h2>
            <div class="payment-methods">
                <button class="payment-method" data-method="cash">
                    <i class="fas fa-money-bill"></i> Cash
                </button>
                <button class="payment-method" data-method="card">
                    <i class="fas fa-credit-card"></i> Card
                </button>
                <button class="payment-method" data-method="mobile">
                    <i class="fas fa-mobile-alt"></i> Mobile
                </button>
            </div>
            <div class="payment-details">
                <!-- Payment details will be shown here -->
            </div>
        </div>
    </div>

    <!-- Item Customization Modal -->
    <div id="customizeModal" class="modal">
        <div class="modal-content">
            <h2>Customize Item</h2>
            <div class="customize-options">
                <!-- Customization options will be loaded here -->
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="services/websocket_service.js"></script>
    <script src="services/crud_service.js"></script>
    <script src="pos_core.js"></script>
    <script src="pos_orders.js"></script>
    <script src="pos_payments.js"></script>
    <script>
        // Initialize WebSocket connection
        const ws = new WebSocketService(Config.getWebSocketUrl());
        ws.connect(<?php echo json_encode($_SESSION['jwt_token']); ?>)
          .then(() => {
              ws.subscribe('orders');
              ws.subscribe('menu_updates');
          })
          .catch(error => {
              console.error('WebSocket connection failed:', error);
          });

        // Initialize POS system
        document.addEventListener('DOMContentLoaded', () => {
            const pos = new POSCore({
                userId: <?php echo $_SESSION['user_id']; ?>,
                userName: <?php echo json_encode($_SESSION['user_name']); ?>,
                taxRate: <?php echo Config::get('tax_rate'); ?>,
                websocket: ws
            });
            pos.initialize();
        });
    </script>
</body>
</html>
