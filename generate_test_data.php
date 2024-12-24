<?php
/**
 * Test Data Generator
 *
 * This script generates realistic test data for the CaféManager system to facilitate
 * development and testing. It creates synthetic data for various entities, including
 * customers, orders, menu items, and staff members, using configurable parameters.
 *
 * Key Features:
 * - **Customizable Data Generation**: Allows configuration of the number of records to generate
 *   for each entity, making it adaptable to different testing scenarios.
 * - **Date Range Configuration**: Supports setting a date range for generated orders, enabling
 *   realistic testing of time-sensitive features.
 * - **Output Directory Management**: Specifies the directory where the generated test data files
 *   will be saved, ensuring organized data storage.
 *
 * Usage:
 * To use this generator, instantiate the [TestDataGenerator] class with the desired configuration
 * method to create all test data:
 *
 * ```php
 * $generator = new TestDataGenerator();
 * $generator->generateAll();
 * ```
 *
 * Ensure that the necessary dependencies are installed and the output directory exists before
 * running the script.
 */

class TestDataGenerator {
    private $config;
    private $menuCategories;
    private $drinkTypes;
    private $foodTypes;
    
    public function __construct($config = []) {
        $this->config = array_merge([
            'customersCount' => 1000,
            'ordersCount' => 5000,
            'menuItemsCount' => 100,
            'staffCount' => 50,
            'startDate' => '2023-01-01',
            'endDate' => date('Y-m-d'),
            'outputDir' => __DIR__ . '/../database/test_data'
        ], $config);
        
        $this->menuCategories = [
            'Hot Drinks', 'Cold Drinks', 'Breakfast', 'Lunch', 
            'Dinner', 'Desserts', 'Snacks', 'Specials'
        ];
        
        $this->drinkTypes = [
            'Coffee', 'Tea', 'Latte', 'Cappuccino', 'Espresso', 
            'Smoothie', 'Juice', 'Soda', 'Frappe', 'Mocha'
        ];
        
        $this->foodTypes = [
            'Sandwich', 'Salad', 'Soup', 'Pasta', 'Burger', 
            'Pizza', 'Wrap', 'Bowl', 'Pastry', 'Cake'
        ];
    }
    
    /**
     * Generate all test data
     */
    public function generateAll() {
        echo "Generating test data...\n";
        
        if (!is_dir($this->config['outputDir'])) {
            mkdir($this->config['outputDir'], 0777, true);
        }
        
        $this->generateCustomers();
        $this->generateMenuItems();
        $this->generateStaff();
        $this->generateOrders();
        $this->generateInventory();
        
        echo "Test data generation complete!\n";
    }
    
    /**
     * Generate random string
     */
    private function randomStr($length = 10) {
        return substr(str_shuffle(str_repeat($x='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 
            ceil($length/strlen($x)))), 1, $length);
    }
    
    /**
     * Generate random date between two dates
     */
    private function randomDate($start, $end) {
        $timestamp = mt_rand(strtotime($start), strtotime($end));
        return date('Y-m-d H:i:s', $timestamp);
    }
    
    /**
     * Generate random element from array
     */
    private function randomElement($array) {
        return $array[array_rand($array)];
    }
    
    /**
     * Generate random elements from array
     */
    private function randomElements($array, $count = 1) {
        shuffle($array);
        return array_slice($array, 0, $count);
    }
    
    /**
     * Generate random number with decimal places
     */
    private function randomPrice($min, $max, $decimals = 2) {
        $scale = pow(10, $decimals);
        return number_format(mt_rand($min * $scale, $max * $scale) / $scale, $decimals, '.', '');
    }
    
    /**
     * Generate customers data
     */
    private function generateCustomers() {
        echo "Generating customers...\n";
        
        $customers = [];
        $firstNames = ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Mary', 'Patricia', 'Linda', 'Barbara'];
        $lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
        
        for ($i = 0; $i < $this->config['customersCount']; $i++) {
            $firstName = $this->randomElement($firstNames);
            $lastName = $this->randomElement($lastNames);
            
            $customers[] = [
                'id' => 'CUST' . str_pad($i + 1, 6, '0', STR_PAD_LEFT),
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => strtolower($firstName . '.' . $lastName . '@example.com'),
                'phone' => '+1' . mt_rand(2000000000, 9999999999),
                'address' => [
                    'street' => mt_rand(100, 9999) . ' ' . $this->randomElement(['Main', 'Oak', 'Maple', 'Cedar']) . ' St',
                    'city' => $this->randomElement(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']),
                    'state' => $this->randomElement(['NY', 'CA', 'IL', 'TX', 'AZ']),
                    'zip' => str_pad(mt_rand(1, 99999), 5, '0', STR_PAD_LEFT)
                ],
                'created_at' => $this->randomDate($this->config['startDate'], $this->config['endDate']),
                'preferences' => [
                    'favorite_items' => [],
                    'dietary_restrictions' => $this->randomElements(['vegetarian', 'vegan', 'gluten-free'], mt_rand(0, 2)),
                    'preferred_payment' => $this->randomElement(['credit_card', 'cash', 'mobile_payment'])
                ],
                'loyalty_points' => mt_rand(0, 1000)
            ];
        }
        
        $this->saveToFile('customers.json', $customers);
    }
    
    /**
     * Generate menu items data
     */
    private function generateMenuItems() {
        echo "Generating menu items...\n";
        
        $menuItems = [];
        
        for ($i = 0; $i < $this->config['menuItemsCount']; $i++) {
            $category = $this->randomElement($this->menuCategories);
            $isDrink = strpos($category, 'Drinks') !== false;
            $name = $isDrink ? 
                $this->randomElement($this->drinkTypes) . ' ' . $this->randomElement(['Hot', 'Iced', 'Special']) :
                $this->randomElement(['Fresh', 'Homemade', 'Classic', 'Signature']) . ' ' . $this->randomElement($this->foodTypes);
            
            $menuItems[] = [
                'id' => 'ITEM' . str_pad($i + 1, 6, '0', STR_PAD_LEFT),
                'name' => $name,
                'category' => $category,
                'description' => 'Delicious ' . strtolower($name) . ' made with premium ingredients',
                'price' => $this->randomPrice(3, 25),
                'cost' => $this->randomPrice(1, 10),
                'preparation_time' => mt_rand(2, 15),
                'is_available' => (mt_rand(1, 10) <= 9), // 90% chance of being available
                'allergens' => $this->randomElements(['nuts', 'dairy', 'eggs', 'soy', 'wheat'], mt_rand(0, 3)),
                'nutrition' => [
                    'calories' => mt_rand(50, 800),
                    'protein' => mt_rand(0, 30),
                    'carbohydrates' => mt_rand(0, 100),
                    'fat' => mt_rand(0, 30)
                ],
                'ingredients' => $isDrink ?
                    $this->randomElements(['Coffee Beans', 'Milk', 'Water', 'Sugar', 'Cream'], mt_rand(2, 4)) :
                    $this->randomElements(['Bread', 'Lettuce', 'Tomato', 'Cheese', 'Chicken'], mt_rand(3, 5)),
                'image_url' => 'https://example.com/images/menu/' . ($i + 1) . '.jpg',
                'created_at' => $this->randomDate($this->config['startDate'], $this->config['endDate']),
                'updated_at' => $this->randomDate($this->config['startDate'], $this->config['endDate'])
            ];
        }
        
        $this->saveToFile('menu_items.json', $menuItems);
    }
    
    /**
     * Generate staff data
     */
    private function generateStaff() {
        echo "Generating staff...\n";
        
        $staff = [];
        $roles = ['server', 'barista', 'chef', 'manager', 'cashier'];
        $shifts = ['morning', 'afternoon', 'evening'];
        
        for ($i = 0; $i < $this->config['staffCount']; $i++) {
            $staff[] = [
                'id' => 'STAFF' . str_pad($i + 1, 4, '0', STR_PAD_LEFT),
                'first_name' => $this->randomElement(['James', 'John', 'Robert', 'Michael', 'William']),
                'last_name' => $this->randomElement(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones']),
                'email' => 'staff' . ($i + 1) . '@cafemanager.com',
                'phone' => '+1' . mt_rand(2000000000, 9999999999),
                'role' => $this->randomElement($roles),
                'hire_date' => $this->randomDate($this->config['startDate'], $this->config['endDate']),
                'preferred_shifts' => $this->randomElements($shifts, mt_rand(1, 2)),
                'performance' => [
                    'average_rating' => $this->randomPrice(3.5, 5, 1),
                    'orders_processed' => mt_rand(100, 1000),
                    'customer_feedback' => $this->randomPrice(4, 5, 1)
                ]
            ];
        }
        
        $this->saveToFile('staff.json', $staff);
    }
    
    /**
     * Generate orders data
     */
    private function generateOrders() {
        echo "Generating orders...\n";
        
        $orders = [];
        $orderStatuses = ['completed', 'cancelled', 'in_progress', 'pending'];
        $orderTypes = ['dine_in', 'takeaway', 'delivery', 'online'];
        
        for ($i = 0; $i < $this->config['ordersCount']; $i++) {
            $itemCount = mt_rand(1, 5);
            $items = [];
            $subtotal = 0;
            
            for ($j = 0; $j < $itemCount; $j++) {
                $price = $this->randomPrice(3, 25);
                $quantity = mt_rand(1, 3);
                $itemTotal = $price * $quantity;
                $subtotal += $itemTotal;
                
                $items[] = [
                    'item_id' => 'ITEM' . str_pad(mt_rand(1, $this->config['menuItemsCount']), 6, '0', STR_PAD_LEFT),
                    'name' => $this->randomElement($this->foodTypes) . '/' . $this->randomElement($this->drinkTypes),
                    'quantity' => $quantity,
                    'unit_price' => $price,
                    'total' => $itemTotal,
                    'modifications' => $this->randomElements([
                        'Extra Hot', 'No Ice', 'Extra Shot', 'Sugar Free',
                        'No Whip', 'Light Ice', 'Extra Cream', 'No Foam'
                    ], mt_rand(0, 2))
                ];
            }
            
            $tax = $subtotal * 0.08; // 8% tax
            $type = $this->randomElement($orderTypes);
            $delivery_fee = ($type === 'delivery') ? 5 : 0;
            $total = $subtotal + $tax + $delivery_fee;
            
            $created_at = $this->randomDate($this->config['startDate'], $this->config['endDate']);
            $status = $this->randomElement($orderStatuses);
            
            $orders[] = [
                'id' => 'ORD' . str_pad($i + 1, 8, '0', STR_PAD_LEFT),
                'customer_id' => 'CUST' . str_pad(mt_rand(1, $this->config['customersCount']), 6, '0', STR_PAD_LEFT),
                'staff_id' => 'STAFF' . str_pad(mt_rand(1, $this->config['staffCount']), 4, '0', STR_PAD_LEFT),
                'type' => $type,
                'status' => $status,
                'items' => $items,
                'subtotal' => round($subtotal, 2),
                'tax' => round($tax, 2),
                'delivery_fee' => $delivery_fee,
                'total' => round($total, 2),
                'created_at' => $created_at,
                'completed_at' => $status === 'completed' ? 
                    date('Y-m-d H:i:s', strtotime($created_at) + mt_rand(600, 3600)) : null,
                'notes' => (mt_rand(1, 10) <= 3) ? 'Special instructions: ' . $this->randomStr(20) : null,
                'rating' => (mt_rand(1, 10) <= 4) ? mt_rand(1, 5) : null,
                'feedback' => (mt_rand(1, 10) <= 2) ? 'Customer feedback: ' . $this->randomStr(50) : null
            ];
        }
        
        usort($orders, function($a, $b) {
            return strtotime($a['created_at']) - strtotime($b['created_at']);
        });
        
        $this->saveToFile('orders.json', $orders);
    }
    
    /**
     * Generate inventory data
     */
    private function generateInventory() {
        echo "Generating inventory...\n";
        
        $inventory = [];
        $units = ['g', 'kg', 'ml', 'l', 'pieces', 'packages'];
        $ingredients = array_merge(
            ['Coffee Beans', 'Milk', 'Water', 'Sugar', 'Cream', 'Tea Leaves', 'Chocolate', 'Caramel'],
            ['Bread', 'Lettuce', 'Tomato', 'Cheese', 'Chicken', 'Beef', 'Rice', 'Pasta', 'Eggs', 'Flour']
        );
        
        foreach ($ingredients as $i => $ingredient) {
            $inventory[] = [
                'id' => 'INV' . str_pad($i + 1, 6, '0', STR_PAD_LEFT),
                'name' => $ingredient,
                'category' => $this->randomElement(['dairy', 'produce', 'meat', 'beverages', 'dry_goods', 'supplies']),
                'unit' => $this->randomElement($units),
                'quantity' => mt_rand(50, 500),
                'minimum_quantity' => mt_rand(20, 50),
                'cost_per_unit' => $this->randomPrice(0.5, 10),
                'supplier' => [
                    'name' => $this->randomElement(['Global Foods', 'Fresh Direct', 'Quality Supply', 'Premium Ingredients']),
                    'contact' => '+1' . mt_rand(2000000000, 9999999999),
                    'lead_time_days' => mt_rand(1, 7)
                ],
                'last_ordered' => $this->randomDate($this->config['startDate'], $this->config['endDate']),
                'last_received' => $this->randomDate($this->config['startDate'], $this->config['endDate'])
            ];
        }
        
        $this->saveToFile('inventory.json', $inventory);
    }
    
    /**
     * Save data to JSON file
     */
    private function saveToFile($filename, $data) {
        $filepath = $this->config['outputDir'] . '/' . $filename;
        file_put_contents($filepath, json_encode($data, JSON_PRETTY_PRINT));
        echo "Saved $filename\n";
    }
}

// Create and run the generator
$generator = new TestDataGenerator();
$generator->generateAll();
