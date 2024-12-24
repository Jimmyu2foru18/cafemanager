/**
 * Order Service
 *
 * This class extends the CRUDService to manage order-related operations
 * within the CaféManager application. It provides methods for performing
 * CRUD operations specifically on orders, including holding and completing
 * orders.
 *
 * Key Features:
 * - **CRUD Operations**: Inherits methods from CRUDService for standardized API interactions
 *   related to orders.
 * - **Hold Order**: Allows holding an order by updating its status to 'held' for later processing.
 * - **Complete Order**: Facilitates the completion of an order, updating its status accordingly.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate methods for order management:
 *
 * ```javascript
 * const orderService = new OrderService();
 * const heldOrder = await orderService.holdOrder(orderData);
 * ```
 *
 * This service assumes that the API endpoint for orders is correctly set up and accessible.
 */
class OrderService extends CRUDService {
  constructor() {
    super('/api/orders');
  }

  /**
   * Hold an order
   * @param {Object} order - Order to hold
   * @returns {Promise<Object>} Held order
   */
  async holdOrder(order) {
    return this.create({ ...order, status: 'held' });
  }

  /**
   * Complete an order
   * @param {string|number} orderId - Order ID
   * @returns {Promise<Object>} Completed order
   */
  async completeOrder(orderId) {
    return this.update(orderId, { status: 'completed' });
  }

  /**
   * Get active orders
   * @returns {Promise<Array>} List of active orders
   */
  async getActiveOrders() {
    return this.list({ status: 'active' });
  }

  /**
   * Get held orders
   * @returns {Promise<Array>} List of held orders
   */
  async getHeldOrders() {
    return this.list({ status: 'held' });
  }

  /**
   * Add item to order
   * @param {string|number} orderId - Order ID
   * @param {Object} item - Item to add
   * @returns {Promise<Object>} Updated order
   */
  async addItem(orderId, item) {
    const order = await this.read(orderId);
    order.items.push(item);
    return this.update(orderId, order);
  }

  /**
   * Remove item from order
   * @param {string|number} orderId - Order ID
   * @param {string|number} itemId - Item ID to remove
   * @returns {Promise<Object>} Updated order
   */
  async removeItem(orderId, itemId) {
    const order = await this.read(orderId);
    order.items = order.items.filter(item => item.id !== itemId);
    return this.update(orderId, order);
  }

  /**
   * Update item quantity in order
   * @param {string|number} orderId - Order ID
   * @param {string|number} itemId - Item ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object>} Updated order
   */
  async updateItemQuantity(orderId, itemId, quantity) {
    const order = await this.read(orderId);
    const item = order.items.find(item => item.id === itemId);
    if (item) {
      item.quantity = quantity;
    }
    return this.update(orderId, order);
  }
}
