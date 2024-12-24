/**
 * Customer Service
 *
 * This class extends the CRUDService to handle Create, Read, Update, and Delete (CRUD)
 * operations specifically for customer entities within the CaféManager application.
 * It provides methods for managing customer data, including retrieving customer information
 * by loyalty card and updating loyalty points.
 *
 * Key Features:
 * - **CRUD Operations**: Inherits methods from CRUDService for standardized API interactions.
 * - **Get Customer by Loyalty Card**: Retrieves customer data using their loyalty card number.
 * - **Update Loyalty Points**: Allows updating of loyalty points for a specific customer.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate methods for customer management:
 *
 * ```javascript
 * const customerService = new CustomerService();
 * customerService.getByLoyaltyCard('123456789').then(customer => {
 *     console.log(customer);
 * });
 * ```
 *
 * This service assumes that the API endpoint for customers is correctly set up and accessible.
 */
class CustomerService extends CRUDService {
  constructor() {
    super('/api/customers');
  }

  /**
   * Get customer by loyalty card
   * @param {string} cardNumber - Loyalty card number
   * @returns {Promise<Object>} Customer data
   */
  async getByLoyaltyCard(cardNumber) {
    return this.list({ loyaltyCard: cardNumber }).then(customers => customers[0]);
  }

  /**
   * Update loyalty points
   * @param {string|number} customerId - Customer ID
   * @param {number} points - Points to add (or subtract if negative)
   * @returns {Promise<Object>} Updated customer
   */
  async updateLoyaltyPoints(customerId, points) {
    const customer = await this.read(customerId);
    const newPoints = (customer.loyaltyPoints || 0) + points;
    return this.update(customerId, { loyaltyPoints: newPoints });
  }

  /**
   * Search customers
   * @param {string} query - Search query
   * @returns {Promise<Array>} List of matching customers
   */
  async searchCustomers(query) {
    return this.list({ search: query });
  }

  /**
   * Get customer order history
   * @param {string|number} customerId - Customer ID
   * @returns {Promise<Array>} List of customer orders
   */
  async getOrderHistory(customerId) {
    const response = await fetch(`${this.endpoint}/${customerId}/orders`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  /**
   * Add customer note
   * @param {string|number} customerId - Customer ID
   * @param {string} note - Customer note
   * @returns {Promise<Object>} Updated customer
   */
  async addNote(customerId, note) {
    const customer = await this.read(customerId);
    const notes = [...(customer.notes || []), {
      text: note,
      timestamp: new Date().toISOString()
    }];
    return this.update(customerId, { notes });
  }
}
