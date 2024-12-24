/**
 * Report Service
 *
 * This service is responsible for generating various reports related to the
 * CaféManager application, including inventory levels and transaction histories.
 * It utilizes the PDFKit library to create PDF reports and provides methods
 * for customizing report generation based on user-defined options.
 *
 * Key Features:
 * - **Inventory Reports**: Generates reports detailing current stock levels and
 *   transaction history for specified date ranges and categories.
 * - **Transaction Reports**: Provides insights into sales transactions, helping
 *   management make informed decisions.
 * - **Customizable Options**: Allows users to specify options such as date ranges
 *   and categories when generating reports.
 *
 * Usage:
 * To use this service, import it into your application and call the appropriate
 * methods for report generation:
 *
 * ```javascript
 * const reportService = require('./report_service');
 * const reportPath = await reportService.generateInventoryReport({ dateRange: 'last month' });
 * ```
 *
 * Ensure that the necessary database configurations are set up before using this service.
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { db } = require('../config/database');

class ReportService {
    /**
     * Generate inventory report with current stock levels and transaction history
     * @param {Object} options Report options (dateRange, categories, etc.)
     * @returns {Promise<string>} Path to generated PDF report
     */
    async generateInventoryReport(options = {}) {
        try {
            const {
                startDate = moment().subtract(30, 'days').format('YYYY-MM-DD'),
                endDate = moment().format('YYYY-MM-DD'),
                categories = [],
                includeTransactions = true
            } = options;

            // Fetch inventory data
            const inventoryQuery = `
                SELECT 
                    i.id, i.name, i.quantity, i.unit, i.alert_threshold,
                    i.cost_per_unit, i.supplier, i.updated_at
                FROM inventory i
                ${categories.length ? 'WHERE i.category IN (?)' : ''}
                ORDER BY i.name
            `;

            const inventory = await db.query(inventoryQuery, [categories]);

            // Fetch transaction history if requested
            let transactions = [];
            if (includeTransactions) {
                const transactionQuery = `
                    SELECT 
                        ia.inventory_id, ia.quantity_change, ia.reason,
                        ia.created_at, u.name as user_name
                    FROM inventory_adjustments ia
                    JOIN users u ON ia.user_id = u.id
                    WHERE ia.created_at BETWEEN ? AND ?
                    ORDER BY ia.created_at DESC
                `;

                transactions = await db.query(transactionQuery, [startDate, endDate]);
            }

            // Generate PDF report
            const doc = new PDFDocument();
            const reportPath = path.join(__dirname, '../reports', `inventory_report_${moment().format('YYYYMMDD_HHmmss')}.pdf`);

            // Create reports directory if it doesn't exist
            if (!fs.existsSync(path.dirname(reportPath))) {
                fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            }

            // Pipe PDF to file
            doc.pipe(fs.createWriteStream(reportPath));

            // Add report header
            doc.fontSize(20).text('Inventory Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Generated on: ${moment().format('YYYY-MM-DD HH:mm:ss')}`, { align: 'right' });
            doc.moveDown();

            // Current Inventory Section
            doc.fontSize(16).text('Current Inventory Status');
            doc.moveDown();

            // Add inventory table
            const inventoryTableTop = 150;
            let yPosition = inventoryTableTop;

            // Table headers
            doc.fontSize(10)
                .text('Item', 50, yPosition)
                .text('Quantity', 200, yPosition)
                .text('Unit', 280, yPosition)
                .text('Alert Level', 340, yPosition)
                .text('Cost/Unit', 420, yPosition);

            yPosition += 20;

            // Table rows
            inventory.forEach(item => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }

                doc.fontSize(10)
                    .text(item.name, 50, yPosition)
                    .text(item.quantity.toString(), 200, yPosition)
                    .text(item.unit, 280, yPosition)
                    .text(item.alert_threshold.toString(), 340, yPosition)
                    .text(`$${item.cost_per_unit.toFixed(2)}`, 420, yPosition);

                yPosition += 20;
            });

            // Transaction History Section
            if (includeTransactions && transactions.length > 0) {
                doc.addPage();
                doc.fontSize(16).text('Transaction History');
                doc.moveDown();

                yPosition = 150;

                // Table headers
                doc.fontSize(10)
                    .text('Date', 50, yPosition)
                    .text('Item', 150, yPosition)
                    .text('Change', 300, yPosition)
                    .text('User', 380, yPosition)
                    .text('Reason', 460, yPosition);

                yPosition += 20;

                // Table rows
                transactions.forEach(trans => {
                    if (yPosition > 700) {
                        doc.addPage();
                        yPosition = 50;
                    }

                    const itemName = inventory.find(i => i.id === trans.inventory_id)?.name || 'Unknown Item';

                    doc.fontSize(10)
                        .text(moment(trans.created_at).format('YYYY-MM-DD HH:mm'), 50, yPosition)
                        .text(itemName, 150, yPosition)
                        .text(trans.quantity_change.toString(), 300, yPosition)
                        .text(trans.user_name, 380, yPosition)
                        .text(trans.reason, 460, yPosition, { width: 100 });

                    yPosition += 20;
                });
            }

            // Add summary section
            doc.addPage();
            doc.fontSize(16).text('Inventory Summary');
            doc.moveDown();

            // Low stock items
            const lowStockItems = inventory.filter(item => item.quantity <= item.alert_threshold);
            doc.fontSize(12).text(`Low Stock Items (${lowStockItems.length})`);
            doc.moveDown();

            lowStockItems.forEach(item => {
                doc.fontSize(10).text(`• ${item.name}: ${item.quantity} ${item.unit} (Alert: ${item.alert_threshold})`);
            });

            doc.moveDown();

            // Value summary
            const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * item.cost_per_unit), 0);
            doc.fontSize(12).text(`Total Inventory Value: $${totalValue.toFixed(2)}`);

            // Finalize PDF
            doc.end();

            return reportPath;

        } catch (error) {
            console.error('Error generating inventory report:', error);
            throw new Error('Failed to generate inventory report');
        }
    }

    /**
     * Generate transaction report for a specific period
     * @param {Object} options Report options (dateRange, categories, etc.)
     * @returns {Promise<string>} Path to generated PDF report
     */
    async generateTransactionReport(options = {}) {
        try {
            const {
                startDate = moment().subtract(30, 'days').format('YYYY-MM-DD'),
                endDate = moment().format('YYYY-MM-DD'),
                categories = []
            } = options;

            // Fetch transaction data
            const query = `
                SELECT 
                    ia.id, ia.inventory_id, i.name as item_name,
                    ia.quantity_change, ia.reason, ia.created_at,
                    u.name as user_name, i.category
                FROM inventory_adjustments ia
                JOIN inventory i ON ia.inventory_id = i.id
                JOIN users u ON ia.user_id = u.id
                WHERE ia.created_at BETWEEN ? AND ?
                ${categories.length ? 'AND i.category IN (?)' : ''}
                ORDER BY ia.created_at DESC
            `;

            const transactions = await db.query(query, [startDate, endDate, categories]);

            // Generate PDF report
            const doc = new PDFDocument();
            const reportPath = path.join(__dirname, '../reports', `transaction_report_${moment().format('YYYYMMDD_HHmmss')}.pdf`);

            // Create reports directory if it doesn't exist
            if (!fs.existsSync(path.dirname(reportPath))) {
                fs.mkdirSync(path.dirname(reportPath), { recursive: true });
            }

            // Pipe PDF to file
            doc.pipe(fs.createWriteStream(reportPath));

            // Add report header
            doc.fontSize(20).text('Transaction Report', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'right' });
            doc.moveDown();

            // Transaction details
            let yPosition = 150;

            // Table headers
            doc.fontSize(10)
                .text('Date', 50, yPosition)
                .text('Item', 150, yPosition)
                .text('Category', 250, yPosition)
                .text('Change', 350, yPosition)
                .text('User', 420, yPosition)
                .text('Reason', 490, yPosition);

            yPosition += 20;

            // Table rows
            transactions.forEach(trans => {
                if (yPosition > 700) {
                    doc.addPage();
                    yPosition = 50;
                }

                doc.fontSize(10)
                    .text(moment(trans.created_at).format('YYYY-MM-DD HH:mm'), 50, yPosition)
                    .text(trans.item_name, 150, yPosition)
                    .text(trans.category, 250, yPosition)
                    .text(trans.quantity_change.toString(), 350, yPosition)
                    .text(trans.user_name, 420, yPosition)
                    .text(trans.reason, 490, yPosition, { width: 100 });

                yPosition += 20;
            });

            // Add summary section
            doc.addPage();
            doc.fontSize(16).text('Transaction Summary');
            doc.moveDown();

            // Summary by category
            const categoryStats = {};
            transactions.forEach(trans => {
                if (!categoryStats[trans.category]) {
                    categoryStats[trans.category] = {
                        count: 0,
                        totalChange: 0
                    };
                }
                categoryStats[trans.category].count++;
                categoryStats[trans.category].totalChange += trans.quantity_change;
            });

            Object.entries(categoryStats).forEach(([category, stats]) => {
                doc.fontSize(12).text(`${category}:`);
                doc.fontSize(10)
                    .text(`  • Number of transactions: ${stats.count}`)
                    .text(`  • Net quantity change: ${stats.totalChange}`);
                doc.moveDown();
            });

            // Finalize PDF
            doc.end();

            return reportPath;

        } catch (error) {
            console.error('Error generating transaction report:', error);
            throw new Error('Failed to generate transaction report');
        }
    }
}

module.exports = new ReportService();
