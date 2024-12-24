<?php
/**
 * CRUD Test Suite
 *
 * This class contains unit tests for the CRUD operations implemented in the CaféManager application.
 * It utilizes PHPUnit to validate the correctness of the CRUD functionality, ensuring that all
 * operations (Create, Read, Update, Delete) work as expected. The tests are designed to cover
 * various scenarios, including successful operations and error handling.
 *
 * Key Features:
 * - **Database Setup**: Initializes a test database environment to isolate tests from production data.
 * - **Test Table Creation**: Creates necessary tables for testing CRUD operations to ensure a clean state.
 * - **Unit Tests**: Implements individual test methods for each CRUD operation, verifying expected outcomes.
 *
 * Usage:
 * To run the tests, execute the following command in the terminal:
 *
 * ```bash
 * phpunit crud_test.php
 * ```
 *
 * This test suite should be run in an environment where the database is configured for testing,
 * and all dependencies are properly installed.
 */

require_once '../vendor/autoload.php';
require_once '../config.php';
require_once '../api/crud_controller.php';

use PHPUnit\Framework\TestCase;

class CRUDTest extends TestCase {
    private $db;
    private $controller;

    protected function setUp(): void {
        // Use test database
        Config::set('db_name', 'cafemanager_test');
        
        // Initialize database connection
        $this->db = Database::getInstance()->getConnection();
        
        // Create test table
        $this->db->exec("
            CREATE TABLE IF NOT EXISTS test_items (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(100) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ");
        
        // Initialize controller
        $this->controller = new class extends CRUDController {
            public function __construct() {
                parent::__construct('test_items');
            }
        };
    }

    protected function tearDown(): void {
        // Clean up test data
        $this->db->exec("DROP TABLE IF EXISTS test_items");
    }

    public function testCreate() {
        $data = [
            'name' => 'Test Item',
            'description' => 'Test Description'
        ];

        $result = $this->controller->create($data);

        $this->assertIsArray($result);
        $this->assertArrayHasKey('id', $result);
        $this->assertGreaterThan(0, $result['id']);
    }

    public function testRead() {
        // Create test item
        $data = [
            'name' => 'Test Item',
            'description' => 'Test Description'
        ];
        $created = $this->controller->create($data);

        // Read item
        $result = $this->controller->read($created['id']);

        $this->assertIsArray($result);
        $this->assertEquals($data['name'], $result['name']);
        $this->assertEquals($data['description'], $result['description']);
    }

    public function testUpdate() {
        // Create test item
        $data = [
            'name' => 'Test Item',
            'description' => 'Test Description'
        ];
        $created = $this->controller->create($data);

        // Update item
        $updateData = [
            'name' => 'Updated Item',
            'description' => 'Updated Description'
        ];
        $result = $this->controller->update($created['id'], $updateData);

        $this->assertTrue($result);

        // Verify update
        $updated = $this->controller->read($created['id']);
        $this->assertEquals($updateData['name'], $updated['name']);
        $this->assertEquals($updateData['description'], $updated['description']);
    }

    public function testDelete() {
        // Create test item
        $data = [
            'name' => 'Test Item',
            'description' => 'Test Description'
        ];
        $created = $this->controller->create($data);

        // Delete item
        $result = $this->controller->delete($created['id']);

        $this->assertTrue($result);

        // Verify deletion
        $deleted = $this->controller->read($created['id']);
        $this->assertNull($deleted);
    }

    public function testList() {
        // Create multiple test items
        $items = [
            ['name' => 'Item 1', 'description' => 'Description 1'],
            ['name' => 'Item 2', 'description' => 'Description 2'],
            ['name' => 'Item 3', 'description' => 'Description 3']
        ];

        foreach ($items as $item) {
            $this->controller->create($item);
        }

        // List all items
        $result = $this->controller->list();

        $this->assertIsArray($result);
        $this->assertCount(3, $result);
    }

    public function testListWithFilters() {
        // Create multiple test items
        $items = [
            ['name' => 'Apple', 'description' => 'Red fruit'],
            ['name' => 'Banana', 'description' => 'Yellow fruit'],
            ['name' => 'Orange', 'description' => 'Orange fruit']
        ];

        foreach ($items as $item) {
            $this->controller->create($item);
        }

        // Test filtering
        $result = $this->controller->list(['name' => 'Apple']);

        $this->assertIsArray($result);
        $this->assertCount(1, $result);
        $this->assertEquals('Apple', $result[0]['name']);
    }

    public function testInvalidCreate() {
        $result = $this->controller->create([]);
        $this->assertArrayHasKey('error', $result);
    }

    public function testInvalidUpdate() {
        $result = $this->controller->update(999, ['name' => 'Test']);
        $this->assertFalse($result);
    }

    public function testInvalidDelete() {
        $result = $this->controller->delete(999);
        $this->assertFalse($result);
    }
}
