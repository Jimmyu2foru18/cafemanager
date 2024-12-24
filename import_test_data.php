<?php
/**
 * Test Data Importer
 *
 * This script imports generated test data into the CaféManager database to facilitate
 * testing and development. It establishes a connection to the database and reads test
 * data files from a specified directory, inserting the data into the appropriate tables.
 *
 * Key Features:
 * - **Database Connection**: Utilizes PDO to connect to the database with error handling.
 * - **Data Directory Management**: Specifies the directory where generated test data files
 *   are stored, ensuring organized data retrieval.
 * - **Data Importing**: Implements methods to read and insert test data into the database,
 *   supporting various entities such as customers, orders, and menu items.
 *
 * Usage:
 * To use this importer, instantiate the [TestDataImporter] class and call the `importAll()`
 * method to import all test data:
 *
 * ```php
 * $importer = new TestDataImporter();
 * $importer->importAll();
 * ```
 *
 * Ensure that the database is properly configured and that the test data files are present
 * in the specified directory before running the script.
 */

require_once __DIR__ . '/../config/database.php';

class TestDataImporter {
    private $db;
    private $dataDir;
    
    public function __construct() {
        $this->db = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
            DB_USER,
            DB_PASSWORD,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        
        $this->dataDir = __DIR__ . '/../database/test_data';
    }
    
    /**
     * Import all test data
     */
    public function importAll() {
        try {
            $this->db->beginTransaction();
            
            echo "Starting data import...\n";
            
            $this->importCustomers();
            $this->importMenuItems();
            $this->importStaff();
            $this->importInventory();
            $this->importOrders();
            
            $this->db->commit();
            echo "Data import completed successfully!\n";
        } catch (Exception $e) {
            $this->db->rollBack();
            echo "Error importing data: " . $e->getMessage() . "\n";
            exit(1);
        }
    }
    
    /**
     * Import customers data
     */
    private function importCustomers() {
        echo "Importing customers...\n";
        $data = $this->loadJsonFile('customers.json');
        
        $stmt = $this->db->prepare("
            INSERT INTO customers (
                id, first_name, last_name, email, phone,
                address_street, address_city, address_state, address_zip,
                created_at, preferences, loyalty_points
            ) VALUES (
                :id, :first_name, :last_name, :email, :phone,
                :address_street, :address_city, :address_state, :address_zip,
                :created_at, :preferences, :loyalty_points
            )
        ");
        
        foreach ($data as $customer) {
            $stmt->execute([
                'id' => $customer['id'],
                'first_name' => $customer['first_name'],
                'last_name' => $customer['last_name'],
                'email' => $customer['email'],
                'phone' => $customer['phone'],
                'address_street' => $customer['address']['street'],
                'address_city' => $customer['address']['city'],
                'address_state' => $customer['address']['state'],
                'address_zip' => $customer['address']['zip'],
                'created_at' => $customer['created_at'],
                'preferences' => json_encode($customer['preferences']),
                'loyalty_points' => $customer['loyalty_points']
            ]);
        }
    }
    
    /**
     * Import menu items data
     */
    private function importMenuItems() {
        echo "Importing menu items...\n";
        $data = $this->loadJsonFile('menu_items.json');
        
        $stmt = $this->db->prepare("
            INSERT INTO menu_items (
                id, name, category, description, price, cost,
                preparation_time, is_available, allergens,
                nutrition_info, ingredients, image_url,
                created_at, updated_at
            ) VALUES (
                :id, :name, :category, :description, :price, :cost,
                :preparation_time, :is_available, :allergens,
                :nutrition_info, :ingredients, :image_url,
                :created_at, :updated_at
            )
        ");
        
        foreach ($data as $item) {
            $stmt->execute([
                'id' => $item['id'],
                'name' => $item['name'],
                'category' => $item['category'],
                'description' => $item['description'],
                'price' => $item['price'],
                'cost' => $item['cost'],
                'preparation_time' => $item['preparation_time'],
                'is_available' => $item['is_available'],
                'allergens' => json_encode($item['allergens']),
                'nutrition_info' => json_encode($item['nutrition']),
                'ingredients' => json_encode($item['ingredients']),
                'image_url' => $item['image_url'],
                'created_at' => $item['created_at'],
                'updated_at' => $item['updated_at']
            ]);
        }
    }
    
    /**
     * Import staff data
     */
    private function importStaff() {
        echo "Importing staff...\n";
        $data = $this->loadJsonFile('staff.json');
        
        $stmt = $this->db->prepare("
            INSERT INTO staff (
                id, first_name, last_name, email, phone,
                role, hire_date, preferred_shifts, performance_metrics
            ) VALUES (
                :id, :first_name, :last_name, :email, :phone,
                :role, :hire_date, :preferred_shifts, :performance_metrics
            )
        ");
        
        foreach ($data as $staff) {
            $stmt->execute([
                'id' => $staff['id'],
                'first_name' => $staff['first_name'],
                'last_name' => $staff['last_name'],
                'email' => $staff['email'],
                'phone' => $staff['phone'],
                'role' => $staff['role'],
                'hire_date' => $staff['hire_date'],
                'preferred_shifts' => json_encode($staff['preferred_shifts']),
                'performance_metrics' => json_encode($staff['performance'])
            ]);
        }
    }
    
    /**
     * Import inventory data
     */
    private function importInventory() {
        echo "Importing inventory...\n";
        $data = $this->loadJsonFile('inventory.json');
        
        $stmt = $this->db->prepare("
            INSERT INTO inventory (
                id, name, category, unit, quantity,
                minimum_quantity, cost_per_unit, supplier_info,
                last_ordered, last_received
            ) VALUES (
                :id, :name, :category, :unit, :quantity,
                :minimum_quantity, :cost_per_unit, :supplier_info,
                :last_ordered, :last_received
            )
        ");
        
        foreach ($data as $item) {
            $stmt->execute([
                'id' => $item['id'],
                'name' => $item['name'],
                'category' => $item['category'],
                'unit' => $item['unit'],
                'quantity' => $item['quantity'],
                'minimum_quantity' => $item['minimum_quantity'],
                'cost_per_unit' => $item['cost_per_unit'],
                'supplier_info' => json_encode($item['supplier']),
                'last_ordered' => $item['last_ordered'],
                'last_received' => $item['last_received']
            ]);
        }
    }
    
    /**
     * Import orders data
     */
    private function importOrders() {
        echo "Importing orders...\n";
        $data = $this->loadJsonFile('orders.json');
        
        $orderStmt = $this->db->prepare("
            INSERT INTO orders (
                id, customer_id, staff_id, type, status,
                subtotal, tax, delivery_fee, total,
                created_at, completed_at, notes, rating, feedback
            ) VALUES (
                :id, :customer_id, :staff_id, :type, :status,
                :subtotal, :tax, :delivery_fee, :total,
                :created_at, :completed_at, :notes, :rating, :feedback
            )
        ");
        
        $itemStmt = $this->db->prepare("
            INSERT INTO order_items (
                order_id, item_id, name, quantity,
                unit_price, total, modifications
            ) VALUES (
                :order_id, :item_id, :name, :quantity,
                :unit_price, :total, :modifications
            )
        ");
        
        foreach ($data as $order) {
            // Insert order
            $orderStmt->execute([
                'id' => $order['id'],
                'customer_id' => $order['customer_id'],
                'staff_id' => $order['staff_id'],
                'type' => $order['type'],
                'status' => $order['status'],
                'subtotal' => $order['subtotal'],
                'tax' => $order['tax'],
                'delivery_fee' => $order['delivery_fee'],
                'total' => $order['total'],
                'created_at' => $order['created_at'],
                'completed_at' => $order['completed_at'],
                'notes' => $order['notes'],
                'rating' => $order['rating'],
                'feedback' => $order['feedback']
            ]);
            
            // Insert order items
            foreach ($order['items'] as $item) {
                $itemStmt->execute([
                    'order_id' => $order['id'],
                    'item_id' => $item['item_id'],
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total' => $item['total'],
                    'modifications' => json_encode($item['modifications'])
                ]);
            }
        }
    }
    
    /**
     * Load JSON file
     * @param string $filename
     * @return array
     */
    private function loadJsonFile($filename) {
        $filepath = $this->dataDir . '/' . $filename;
        if (!file_exists($filepath)) {
            throw new Exception("File not found: $filename");
        }
        
        $data = json_decode(file_get_contents($filepath), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON in file: $filename");
        }
        
        return $data;
    }
}

// Run the importer
$importer = new TestDataImporter();
$importer->importAll();
