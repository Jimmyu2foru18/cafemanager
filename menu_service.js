/**
 * Menu Service
 *
 * This class extends the CRUDService to manage menu-related operations
 * within the CaféManager application. It provides methods for performing
 * CRUD operations specifically on menu items, such as retrieving items by
 * category and updating their availability.
 *
 * Key Features:
 * - **CRUD Operations**: Inherits methods from CRUDService for standardized API interactions
 *   related to menu items.
 * - **Get Menu Items by Category**: Retrieves a list of menu items that belong to a specified
 *   category, facilitating easy access to categorized data.
 * - **Update Item Availability**: Allows updating the availability status of a specific menu
 *   item based on its ID.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate methods for menu management:
 *
 * ```javascript
 * const menuService = new MenuService();
 * const items = await menuService.getByCategory('drinks');
 * ```
 *
 * This service assumes that the API endpoint for menu items is correctly set up and accessible.
 */
class MenuService extends CRUDService {
  constructor() {
    super('/api/menu-items');
  }

  /**
   * Get menu items by category
   * @param {string} category - Category name
   * @returns {Promise<Array>} List of menu items
   */
  async getByCategory(category) {
    return this.list({ category });
  }

  /**
   * Update item availability
   * @param {string|number} itemId - Item ID
   * @param {boolean} available - Availability status
   * @returns {Promise<Object>} Updated menu item
   */
  async updateAvailability(itemId, available) {
    return this.update(itemId, { available });
  }

  /**
   * Update item price
   * @param {string|number} itemId - Item ID
   * @param {number} price - New price
   * @returns {Promise<Object>} Updated menu item
   */
  async updatePrice(itemId, price) {
    return this.update(itemId, { price });
  }

  /**
   * Get available items
   * @returns {Promise<Array>} List of available items
   */
  async getAvailableItems() {
    return this.list({ available: true });
  }

  /**
   * Search menu items
   * @param {string} query - Search query
   * @returns {Promise<Array>} List of matching items
   */
  async searchItems(query) {
    return this.list({ search: query });
  }
}
