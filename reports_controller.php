<?php
/**
 * Reports Controller
 *
 * This controller handles incoming requests for generating various reports
 * within the CaféManager application. It acts as an intermediary between the
 * user interface and the report generation service, facilitating the creation
 * of reports based on user-defined parameters.
 *
 * Key Features:
 * - **Report Generation**: Delegates report generation tasks to the ReportService,
 *   ensuring that reports are created accurately and efficiently.
 * - **Inventory Reports**: Provides functionality to generate inventory reports,
 *   including options for filtering by date range and categories.
 * - **Error Handling**: Implements error handling to manage exceptions during
 *   report generation, providing appropriate feedback to the user.
 *
 * Usage:
 * To use this controller, instantiate it and call the appropriate methods to handle
 * report generation requests:
 *
 * ```php
 * $reportsController = new ReportsController();
 * $reportsController->generateInventoryReport();
 * ```
 *
 * Ensure that the report service is correctly configured and accessible before
 * using this controller.
 */
require_once __DIR__ . '/../../services/report_service.js';

class ReportsController {
    private $reportService;
    
    public function __construct() {
        $this->reportService = require(__DIR__ . '/../../services/report_service.js');
    }
    
    /**
     * Generate inventory report
     */
    public function generateInventoryReport() {
        try {
            // Get report options from request
            $options = [
                'startDate' => $_GET['startDate'] ?? null,
                'endDate' => $_GET['endDate'] ?? null,
                'categories' => $_GET['categories'] ?? [],
                'includeTransactions' => $_GET['includeTransactions'] ?? true
            ];
            
            // Generate report
            $reportPath = $this->reportService->generateInventoryReport($options);
            
            // Send file to client
            if (file_exists($reportPath)) {
                header('Content-Type: application/pdf');
                header('Content-Disposition: attachment; filename="' . basename($reportPath) . '"');
                header('Content-Length: ' . filesize($reportPath));
                readfile($reportPath);
                exit;
            } else {
                throw new Exception('Report file not found');
            }
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
    
    /**
     * Generate transaction report
     */
    public function generateTransactionReport() {
        try {
            // Get report options from request
            $options = [
                'startDate' => $_GET['startDate'] ?? null,
                'endDate' => $_GET['endDate'] ?? null,
                'categories' => $_GET['categories'] ?? []
            ];
            
            // Generate report
            $reportPath = $this->reportService->generateTransactionReport($options);
            
            // Send file to client
            if (file_exists($reportPath)) {
                header('Content-Type: application/pdf');
                header('Content-Disposition: attachment; filename="' . basename($reportPath) . '"');
                header('Content-Length: ' . filesize($reportPath));
                readfile($reportPath);
                exit;
            } else {
                throw new Exception('Report file not found');
            }
            
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}

// Create controller instance
$controller = new ReportsController();

// Handle request based on action
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'inventory':
        $controller->generateInventoryReport();
        break;
    case 'transactions':
        $controller->generateTransactionReport();
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action specified']);
}
