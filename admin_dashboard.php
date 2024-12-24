<?php
/*
 * Admin Dashboard
 *
 * This file serves as the main entry point for the Admin Dashboard of the CaféManager application.
 * It includes necessary configurations and authentication checks to ensure that only authorized 
 * users can access the dashboard functionalities.
 *
 * Key Features:
 * - Requires configuration and authentication files to set up the environment.
 * - Checks if the user is logged in and has the appropriate admin role.
 * - Contains the HTML structure for the dashboard, including sidebar navigation and main content area.
 * - Integrates external libraries such as Chart.js for data visualization.
 *
 * Note: Ensure that any changes made here are reflected in the corresponding CSS and JavaScript files
 * to maintain consistency in the user interface.
 */
<?php
require_once 'config.php';
require_once 'auth.php';

// Check if user is logged in and has admin role
$auth = Auth::getInstance();
if (!$auth->hasRole('admin')) {
    header('Location: /login');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CaféManager Pro - Admin Dashboard</title>
    <link rel="stylesheet" href="admin_dashboard.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="admin-container">
        <!-- Sidebar Navigation -->
        <nav class="admin-sidebar">
            <div class="sidebar-header">
                <img src="assets/logo.png" alt="CaféManager Pro" class="logo">
                <h1>Admin Panel</h1>
            </div>
            
            <div class="sidebar-menu">
                <a href="admin_dashboard.php" class="menu-item active">
                    <i class="fas fa-chart-line"></i>
                    Dashboard
                </a>
                <a href="order_tracking.php" class="menu-item">
                    <i class="fas fa-shopping-cart"></i>
                    Orders
                </a>
                <a href="inventory_manager.php" class="menu-item">
                    <i class="fas fa-box"></i>
                    Inventory
                </a>
                <a href="menu_display.php" class="menu-item">
                    <i class="fas fa-utensils"></i>
                    Menu Management
                </a>
                <a href="staff_manager.php" class="menu-item">
                    <i class="fas fa-users"></i>
                    Staff
                </a>
                <a href="customer_manager.php" class="menu-item">
                    <i class="fas fa-user-friends"></i>
                    Customers
                </a>
                <a href="reports_generator.php" class="menu-item">
                    <i class="fas fa-file-alt"></i>
                    Reports
                </a>
                <a href="settings_manager.php" class="menu-item">
                    <i class="fas fa-cog"></i>
                    Settings
                </a>
            </div>
        </nav>

        <!-- Main Content -->
        <main class="admin-main">
            <!-- Top Bar -->
            <div class="top-bar">
                <div class="search-bar">
                    <i class="fas fa-search"></i>
                    <input type="text" placeholder="Search...">
                </div>
                <div class="top-bar-actions">
                    <div class="notifications">
                        <i class="fas fa-bell"></i>
                        <span class="notification-badge">3</span>
                    </div>
                    <div class="admin-profile">
                        <img src="assets/avatar.png" alt="Admin">
                        <span><?php echo htmlspecialchars($auth->getCurrentUser()['name']); ?></span>
                    </div>
                </div>
            </div>

            <!-- Dashboard Content -->
            <div class="dashboard-content">
                <!-- Quick Stats -->
                <div class="quick-stats">
                    <div class="stat-card">
                        <div class="stat-icon sales">
                            <i class="fas fa-dollar-sign"></i>
                        </div>
                        <div class="stat-details">
                            <h3>Today's Sales</h3>
                            <p class="stat-value">$0.00</p>
                            <p class="stat-change positive">+15% vs yesterday</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon orders">
                            <i class="fas fa-shopping-bag"></i>
                        </div>
                        <div class="stat-details">
                            <h3>Active Orders</h3>
                            <p class="stat-value">0</p>
                            <p class="stat-change">Processing now</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon customers">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-details">
                            <h3>New Customers</h3>
                            <p class="stat-value">0</p>
                            <p class="stat-change positive">+5% this week</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon inventory">
                            <i class="fas fa-box"></i>
                        </div>
                        <div class="stat-details">
                            <h3>Low Stock Items</h3>
                            <p class="stat-value">0</p>
                            <p class="stat-change negative">Needs attention</p>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div class="charts-row">
                    <!-- Sales Chart -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>Sales Overview</h3>
                            <div class="chart-actions">
                                <button class="chart-period active" data-period="day">Day</button>
                                <button class="chart-period" data-period="week">Week</button>
                                <button class="chart-period" data-period="month">Month</button>
                            </div>
                        </div>
                        <canvas id="salesChart"></canvas>
                    </div>

                    <!-- Popular Items Chart -->
                    <div class="chart-card">
                        <div class="chart-header">
                            <h3>Popular Items</h3>
                            <select id="categoryFilter">
                                <option value="all">All Categories</option>
                                <option value="hot-coffee">Hot Coffee</option>
                                <option value="cold-coffee">Cold Coffee</option>
                                <option value="food">Food</option>
                            </select>
                        </div>
                        <canvas id="popularItemsChart"></canvas>
                    </div>
                </div>

                <!-- Recent Activity and Alerts -->
                <div class="activity-alerts-row">
                    <!-- Recent Activity -->
                    <div class="activity-card">
                        <h3>Recent Activity</h3>
                        <div class="activity-list" id="recentActivity">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>

                    <!-- Alerts and Notifications -->
                    <div class="alerts-card">
                        <h3>Alerts & Notifications</h3>
                        <div class="alerts-list" id="alertsList">
                            <!-- Populated by JavaScript -->
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Scripts -->
    <script src="admin_dashboard.js"></script>
</body>
</html>
