-- CaféManager Database Schema
--
-- This SQL schema defines the core tables and relationships for the CaféManager
-- system. It includes the necessary structures for user authentication, inventory
-- management, order processing, and reporting functionalities.
--
-- Key Components:
-- - **Users Table**: Stores user authentication details and roles for access control.
-- - **Inventory Table**: Manages inventory items, including stock levels and descriptions.
-- - **Orders Table**: Records customer orders, including order details and statuses.
-- - **Payments Table**: Handles payment records associated with customer orders.
-- - **Reports Table**: Facilitates the generation of various reports for management.
--
-- Configuration Settings:
-- - Enables strict mode for better data integrity.
-- - Sets the time zone to UTC for consistency across the application.
--
-- Usage:
-- This schema should be executed in the database to set up the required tables
-- for the CaféManager application. Ensure that the database connection is properly
-- configured before running this script.

-- Enable strict mode for better data integrity
SET SQL_MODE = "STRICT_ALL_TABLES";
SET time_zone = '+00:00';

-- -----------------------------------------------------
-- Table: users
-- Description: Stores user authentication and role data
-- -----------------------------------------------------
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL COMMENT 'Unique username for login',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Argon2id hashed password',
    role ENUM('admin', 'manager', 'staff') NOT NULL COMMENT 'User role for access control',
    name VARCHAR(100) NOT NULL COMMENT 'Full name of the user',
    email VARCHAR(100) UNIQUE NOT NULL COMMENT 'Email address for notifications',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    active BOOLEAN DEFAULT TRUE COMMENT 'Whether user account is active',
    INDEX idx_user_role (role) COMMENT 'Index for role-based queries',
    INDEX idx_role_status (role, active) COMMENT 'Index for role and status'
) ENGINE=InnoDB COMMENT='User authentication and authorization';

-- -----------------------------------------------------
-- Table: menu_items
-- Description: Stores menu items available for sale
-- -----------------------------------------------------
CREATE TABLE menu_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT 'Item name as shown on menu',
    description TEXT COMMENT 'Detailed item description',
    price DECIMAL(10,2) NOT NULL COMMENT 'Current selling price',
    category VARCHAR(50) NOT NULL COMMENT 'Item category for grouping',
    image_url VARCHAR(255) COMMENT 'URL to item image',
    available BOOLEAN DEFAULT TRUE COMMENT 'Whether item is available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_menu_category (category) COMMENT 'Index for category filtering',
    INDEX idx_menu_available (available) COMMENT 'Index for availability filtering',
    INDEX idx_category_status (category, available) COMMENT 'Index for category and status'
) ENGINE=InnoDB COMMENT='Menu items catalog';

-- -----------------------------------------------------
-- Table: customers
-- Description: Stores customer information and loyalty data
-- -----------------------------------------------------
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT 'Customer full name',
    email VARCHAR(100) UNIQUE COMMENT 'Email for notifications',
    phone VARCHAR(20) COMMENT 'Contact phone number',
    loyalty_points INT DEFAULT 0 COMMENT 'Current loyalty points balance',
    notes JSON COMMENT 'Additional customer notes and preferences',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_email (email) COMMENT 'Index for email lookups',
    INDEX idx_customer_phone (phone) COMMENT 'Index for phone lookups'
) ENGINE=InnoDB COMMENT='Customer management and loyalty';

-- -----------------------------------------------------
-- Table: inventory
-- Description: Tracks inventory items and stock levels
-- -----------------------------------------------------
CREATE TABLE inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL COMMENT 'Item name',
    quantity DECIMAL(10,2) NOT NULL COMMENT 'Current quantity in stock',
    unit VARCHAR(20) NOT NULL COMMENT 'Unit of measurement',
    alert_threshold DECIMAL(10,2) NOT NULL COMMENT 'Low stock alert level',
    cost_per_unit DECIMAL(10,2) NOT NULL COMMENT 'Cost price per unit',
    supplier VARCHAR(100) COMMENT 'Primary supplier name',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inventory_quantity (quantity) COMMENT 'Index for stock level queries',
    INDEX idx_low_stock (quantity, alert_threshold) COMMENT 'Index for low stock'
) ENGINE=InnoDB COMMENT='Inventory management';

-- -----------------------------------------------------
-- Table: inventory_adjustments
-- Description: Tracks changes to inventory levels
-- -----------------------------------------------------
CREATE TABLE inventory_adjustments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    inventory_id INT NOT NULL COMMENT 'Reference to inventory item',
    quantity_change DECIMAL(10,2) NOT NULL COMMENT 'Amount added or removed',
    reason VARCHAR(255) NOT NULL COMMENT 'Reason for adjustment',
    user_id INT NOT NULL COMMENT 'User who made the adjustment',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    INDEX idx_adjustment_date (created_at) COMMENT 'Index for date-based queries',
    INDEX idx_item_date (inventory_id, created_at) COMMENT 'Index for item and date',
    INDEX idx_user_fk (user_id) COMMENT 'Index for user foreign key'
) ENGINE=InnoDB COMMENT='Inventory adjustment history';

-- -----------------------------------------------------
-- Table: orders
-- Description: Stores customer orders and status
-- -----------------------------------------------------
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT COMMENT 'Optional link to customer',
    user_id INT NOT NULL COMMENT 'Staff member who created order',
    status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled') 
        NOT NULL DEFAULT 'pending' 
        COMMENT 'Current order status',
    total_amount DECIMAL(10,2) NOT NULL COMMENT 'Total order amount',
    payment_method VARCHAR(50) COMMENT 'Method of payment',
    payment_status ENUM('pending', 'paid', 'refunded') 
        NOT NULL DEFAULT 'pending'
        COMMENT 'Payment status',
    notes TEXT COMMENT 'Special instructions or notes',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    INDEX idx_order_status (status) COMMENT 'Index for status filtering',
    INDEX idx_order_date (created_at) COMMENT 'Index for date-based queries',
    INDEX idx_status_date (status, created_at) COMMENT 'Index for status and date',
    INDEX idx_customer_fk (customer_id) COMMENT 'Index for customer foreign key'
) ENGINE=InnoDB COMMENT='Customer orders';

-- -----------------------------------------------------
-- Table: order_items
-- Description: Individual items within orders
-- -----------------------------------------------------
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL COMMENT 'Reference to parent order',
    menu_item_id INT NOT NULL COMMENT 'Reference to menu item',
    quantity INT NOT NULL COMMENT 'Quantity ordered',
    unit_price DECIMAL(10,2) NOT NULL COMMENT 'Price at time of order',
    notes TEXT COMMENT 'Special instructions for this item',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    INDEX idx_order_items (order_id, menu_item_id) COMMENT 'Index for order item lookups',
    INDEX idx_order_item (order_id, menu_item_id) COMMENT 'Index for order item',
    INDEX idx_menu_item_fk (menu_item_id) COMMENT 'Index for menu item foreign key'
) ENGINE=InnoDB COMMENT='Order line items';
