/**
 * Online Ordering Service
 *
 * This class manages the online ordering functionality for the CaféManager application.
 * It handles the processing of customer orders, menu management, and real-time updates
 * on order status. Additionally, it provides mechanisms for notifying customers about
 * their order status through various channels.
 *
 * Key Features:
 * - **Menu Management**: Manages the available menu items for online ordering, allowing
 *   for updates and retrieval of menu data.
 * - **Order Processing**: Facilitates the creation, updating, and tracking of customer orders.
 * - **Real-Time Status Updates**: Utilizes WebSocket connections to provide real-time updates
 *   on order status to customers and staff.
 * - **Customer Notifications**: Integrates with the NotificationService to send alerts and
 *   updates to customers regarding their orders.
 *
 * Configuration:
 * The service can be initialized with configuration options, including the notification
 * service and WebSocket settings.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate methods for managing online
 * orders:
 *
 * ```javascript
 * const onlineOrderingService = new OnlineOrderingService({ notificationService: someService });
 * onlineOrderingService.processOrder(orderData);
 * ```
 *
 * Ensure that the necessary services and dependencies are properly configured before using
 * this class.
 */

class OnlineOrderingService {
    constructor(config) {
        this.config = {
            notificationService: null,
            websocket: null,
            ...config
        };
        
        this.activeOrders = new Map();
        this.setupWebSocket();
    }

    /**
     * Set up WebSocket connection
     * @private
     */
    setupWebSocket() {
        if (!this.config.websocket) return;
        
        this.config.websocket.on('order_update', (data) => {
            this.handleOrderUpdate(data);
        });
        
        this.config.websocket.on('kitchen_update', (data) => {
            this.handleKitchenUpdate(data);
        });
    }

    /**
     * Get menu with availability
     * @param {Object} filters Menu filters
     * @returns {Promise<Array>} Menu items
     */
    async getMenu(filters = {}) {
        try {
            const response = await fetch('/api/menu?' + new URLSearchParams(filters));
            if (!response.ok) throw new Error('Failed to fetch menu');
            
            const menu = await response.json();
            return this.processMenuData(menu);
        } catch (error) {
            console.error('Menu fetch error:', error);
            throw error;
        }
    }

    /**
     * Process menu data with availability
     * @param {Object} menuData Raw menu data
     * @returns {Object} Processed menu data
     * @private
     */
    processMenuData(menuData) {
        return {
            ...menuData,
            items: menuData.items.map(item => ({
                ...item,
                isAvailable: this.checkItemAvailability(item)
            }))
        };
    }

    /**
     * Check item availability
     * @param {Object} item Menu item
     * @returns {boolean} Availability status
     * @private
     */
    checkItemAvailability(item) {
        return item.available && (!item.inventory_check || 
            (item.inventory_check && item.stock_level > item.minimum_stock));
    }

    /**
     * Place new order
     * @param {Object} orderData Order details
     * @returns {Promise<Object>} Order confirmation
     */
    async placeOrder(orderData) {
        try {
            // Validate order
            this.validateOrder(orderData);
            
            // Create order
            const order = await this.createOrder(orderData);
            
            // Send notifications
            await this.sendOrderConfirmation(order);
            
            // Track order
            this.activeOrders.set(order.id, order);
            
            return {
                order_id: order.id,
                tracking_url: this.generateTrackingUrl(order.id),
                estimated_delivery: order.estimated_delivery
            };
        } catch (error) {
            console.error('Order placement error:', error);
            throw error;
        }
    }

    /**
     * Validate order data
     * @param {Object} orderData Order details
     * @throws {Error} Validation error
     * @private
     */
    validateOrder(orderData) {
        const errors = [];
        
        if (!orderData.items || !orderData.items.length) {
            errors.push('Order must contain items');
        }
        
        if (!orderData.customer) {
            errors.push('Customer information is required');
        }
        
        if (!orderData.delivery && !orderData.pickup) {
            errors.push('Delivery or pickup information is required');
        }
        
        if (errors.length) {
            throw new Error('Order validation failed: ' + errors.join(', '));
        }
    }

    /**
     * Calculate order total
     * @param {Object} orderData Order details
     * @returns {number} Order total
     * @private
     */
    calculateTotal(orderData) {
        let subtotal = orderData.items.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);
        
        // Add delivery fee if applicable
        if (orderData.delivery) {
            subtotal += this.calculateDeliveryFee(orderData.delivery);
        }
        
        // Add tax
        const tax = subtotal * this.config.taxRate;
        
        return subtotal + tax;
    }

    /**
     * Calculate delivery fee
     * @param {Object} deliveryInfo Delivery information
     * @returns {number} Delivery fee
     * @private
     */
    calculateDeliveryFee(deliveryInfo) {
        // Implementation depends on delivery fee calculation logic
        return 5.00; // Basic flat rate
    }

    /**
     * Create order in system
     * @param {Object} orderData Order details
     * @returns {Promise<Object>} Created order
     * @private
     */
    async createOrder(orderData) {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...orderData,
                total: this.calculateTotal(orderData),
                status: 'pending',
                created_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to create order');
        }
        
        return response.json();
    }

    /**
     * Send order confirmation
     * @param {Object} order Order details
     * @returns {Promise} Notification result
     * @private
     */
    async sendOrderConfirmation(order) {
        if (!this.config.notificationService) return;
        
        return this.config.notificationService.send({
            type: 'order_confirmation',
            recipient: order.customer.email,
            data: {
                order_id: order.id,
                tracking_url: this.generateTrackingUrl(order.id),
                estimated_delivery: order.estimated_delivery
            }
        });
    }

    /**
     * Generate order tracking URL
     * @param {string} orderId Order ID
     * @returns {string} Tracking URL
     * @private
     */
    generateTrackingUrl(orderId) {
        return `${window.location.origin}/track/${orderId}`;
    }

    /**
     * Get order status
     * @param {string} orderId Order ID
     * @returns {Promise<Object>} Order status
     */
    async getOrderStatus(orderId) {
        const response = await fetch(`/api/orders/${orderId}/status`);
        if (!response.ok) throw new Error('Failed to fetch order status');
        return response.json();
    }

    /**
     * Handle order status update
     * @param {Object} update Status update
     * @private
     */
    handleOrderUpdate(update) {
        const order = this.activeOrders.get(update.order_id);
        if (!order) return;
        
        order.status = update.status;
        order.timeline.push({
            status: update.status,
            timestamp: new Date(),
            note: update.note
        });
        
        // Notify listeners
        this.emit('order_updated', order);
        
        // Send customer notification if configured
        if (this.config.notificationService) {
            this.config.notificationService.send({
                type: 'order_status',
                recipient: order.customer.email,
                data: {
                    order_id: order.id,
                    status: update.status,
                    note: update.note
                }
            });
        }
    }

    /**
     * Handle kitchen update
     * @param {Object} update Kitchen update
     * @private
     */
    handleKitchenUpdate(update) {
        const order = this.activeOrders.get(update.order_id);
        if (!order) return;
        
        order.preparation_status = update.status;
        order.estimated_completion = update.estimated_completion;
        
        // Notify listeners
        this.emit('kitchen_updated', order);
    }

    /**
     * Cancel order
     * @param {string} orderId Order ID
     * @param {string} reason Cancellation reason
     * @returns {Promise<Object>} Cancellation result
     */
    async cancelOrder(orderId, reason) {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        
        if (!response.ok) throw new Error('Failed to cancel order');
        
        const result = await response.json();
        this.activeOrders.delete(orderId);
        
        return result;
    }

    /**
     * Clean up completed orders
     * @private
     */
    cleanupCompletedOrders() {
        for (const [orderId, order] of this.activeOrders) {
            if (['completed', 'cancelled'].includes(order.status)) {
                this.activeOrders.delete(orderId);
            }
        }
    }
}

export default OnlineOrderingService;
