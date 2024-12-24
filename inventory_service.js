/**
 * Inventory Service
 *
 * This class extends the CRUDService to manage inventory-related operations
 * within the CaféManager application. It provides methods for performing CRUD
 * operations specifically on inventory items, such as updating stock levels and
 * retrieving inventory data.
 *
 * Key Features:
 * - **CRUD Operations**: Inherits methods from CRUDService for standardized API interactions
 *   related to inventory items.
 * - **Update Stock Level**: Allows updating of the stock quantity for a specific inventory item,
 *   adding or subtracting from the current quantity based on the provided value.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate methods for inventory management:
 *
 * ```javascript
 * const inventoryService = new InventoryService();
 * inventoryService.updateStock('itemId123', 10).then(updatedItem => {
 *     console.log('Updated Item:', updatedItem);
 * });
 * ```
 *
 * This service assumes that the API endpoint for inventory is correctly set up and accessible.
 */
class InventoryService extends CRUDService {
  constructor() {
    super('/api/inventory');
  }

  /**
   * Update stock level
   * @param {string|number} itemId - Item ID
   * @param {number} quantity - Quantity to add (or subtract if negative)
   * @returns {Promise<Object>} Updated inventory item
   */
  async updateStock(itemId, quantity) {
    const item = await this.read(itemId);
    const newQuantity = (item.quantity || 0) + quantity;
    return this.update(itemId, { quantity: newQuantity });
  }

  /**
   * Get low stock items
   * @param {number} threshold - Low stock threshold
   * @returns {Promise<Array>} List of low stock items
   */
  async getLowStockItems(threshold) {
    return this.list({ lowStock: threshold });
  }

  /**
   * Record stock adjustment
   * @param {string|number} itemId - Item ID
   * @param {number} quantity - Adjustment quantity
   * @param {string} reason - Adjustment reason
   * @returns {Promise<Object>} Stock adjustment record
   */
  async recordStockAdjustment(itemId, quantity, reason) {
    const adjustment = {
      itemId,
      quantity,
      reason,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(`${this.endpoint}/${itemId}/adjustments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(adjustment)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Get stock history
   * @param {string|number} itemId - Item ID
   * @param {Object} dateRange - Date range for history
   * @returns {Promise<Array>} Stock history
   */
  async getStockHistory(itemId, dateRange) {
    const params = new URLSearchParams(dateRange).toString();
    const response = await fetch(`${this.endpoint}/${itemId}/history?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Set stock alert threshold
   * @param {string|number} itemId - Item ID
   * @param {number} threshold - Alert threshold
   * @returns {Promise<Object>} Updated inventory item
   */
  async setAlertThreshold(itemId, threshold) {
    return this.update(itemId, { alertThreshold: threshold });
  }
}
