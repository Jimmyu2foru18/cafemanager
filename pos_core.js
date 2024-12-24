/**
 * Point of Sale (POS) Core System
 *
 * This module handles core functionalities of the Point of Sale (POS) system for the
 * CaféManager application, including order management, menu display, real-time updates,
 * and user interface interactions. It provides a structured approach to managing
 * customer orders and integrating with various services.
 *
 * Key Features:
 * - **Order Management**: Facilitates the creation, updating, and tracking of customer orders.
 * - **Menu Display**: Manages the presentation of menu items, allowing for filtering and
 *   selection based on categories.
 * - **Real-Time Updates**: Utilizes WebSocket connections to provide real-time updates on
 *   order status and inventory changes.
 * - **User Interface Interactions**: Handles user interactions for a seamless experience,
 *   including event listeners and UI updates.
 *
 * Configuration Constants:
 * - `TAX_RATE`: The applicable tax rate for orders.
 * - `TOAST_DURATION`: Duration for displaying toast notifications.
 * - `WEBSOCKET_RETRY_DELAY`: Delay for retrying WebSocket connections.
 * - `ORDER_TIMER_INTERVAL`: Interval for order timer updates.
 *
 * Usage:
 * This module is intended to be used within the CaféManager application. It should be
 * initialized when the DOM is ready, and its methods can be called to manage POS operations:
 *
 * ```javascript
 * window.posCore = new POSCore();
 * ```
 *
 * Ensure that the necessary services and configurations are set up before using this module.
 */

// Configuration constants
const POS_CONFIG = {
  TAX_RATE: 0.08,
  TOAST_DURATION: 3000,
  WEBSOCKET_RETRY_DELAY: 5000,
  ORDER_TIMER_INTERVAL: 1000
};

// Event types for WebSocket communication
const WS_EVENTS = {
  MENU_UPDATE: 'menu_update',
  INVENTORY_UPDATE: 'inventory_update',
  ORDER_UPDATE: 'order_update'
};

// CSS classes and selectors
const UI_CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  OUT_OF_STOCK: 'out-of-stock',
  TOAST: {
    BASE: 'toast',
    ERROR: 'error',
    SUCCESS: 'success'
  }
};

/**
 * Core POS functionality class
 * @class POSCore
 */
class POSCore {
  constructor() {
    this.initializeOnDOMReady();
  }

  /**
   * Initialize POS system when DOM is ready
   * @private
   */
  initializeOnDOMReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  /**
   * Initialize POS system state and components
   * @private
   */
  initialize() {
    this.initializeState();
    this.bindElements();
    this.initializeWebSocket();
    this.initializeEventListeners();
    this.loadMenuItems().catch(error => 
      this.handleError('Failed to load menu items', error)
    );
  }

  /**
   * Initialize POS system state
   * @private
   */
  initializeState() {
    this.state = {
      currentOrder: this.createNewOrderState(),
      menuItems: [],
      selectedCategory: 'all',
      heldOrders: [],
      isLoading: false,
      webSocketConnected: false
    };
  }

  /**
   * Create new order state object
   * @returns {Object} New order state
   * @private
   */
  createNewOrderState() {
    return {
      id: Date.now(),
      items: [],
      customer: null,
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      createdAt: new Date()
    };
  }

  /**
   * Bind DOM elements
   * @private
   */
  bindElements() {
    this.elements = {
      menuItemsGrid: document.getElementById('menuItemsGrid'),
      orderItems: document.getElementById('orderItems'),
      orderNumber: document.getElementById('orderNumber'),
      orderTime: document.getElementById('orderTime'),
      subtotal: document.getElementById('subtotal'),
      tax: document.getElementById('tax'),
      discount: document.getElementById('discount'),
      total: document.getElementById('total'),
      categoryButtons: document.querySelectorAll('.category-btn'),
      newOrderBtn: document.getElementById('newOrderBtn'),
      holdOrderBtn: document.getElementById('holdOrderBtn'),
      recallOrderBtn: document.getElementById('recallOrderBtn'),
      paymentBtn: document.getElementById('paymentBtn')
    };

    // Validate required elements
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        throw new Error(`Required element not found: ${key}`);
      }
    });
  }

  /**
   * Initialize WebSocket connection with retry mechanism
   * @private
   */
  initializeWebSocket() {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/pos`;
      
      this.socket = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.handleError('WebSocket initialization failed', error);
      setTimeout(() => this.initializeWebSocket(), POS_CONFIG.WEBSOCKET_RETRY_DELAY);
    }
  }

  /**
   * Set up WebSocket event handlers
   * @private
   */
  setupWebSocketHandlers() {
    this.socket.onopen = () => {
      this.state.webSocketConnected = true;
      this.showSuccess('Connected to server');
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleRealtimeUpdate(data);
      } catch (error) {
        this.handleError('Invalid WebSocket message', error);
      }
    };

    this.socket.onclose = () => {
      this.state.webSocketConnected = false;
      this.showError('Connection lost. Reconnecting...');
      setTimeout(() => this.initializeWebSocket(), POS_CONFIG.WEBSOCKET_RETRY_DELAY);
    };

    this.socket.onerror = (error) => {
      this.handleError('WebSocket error', error);
    };
  }

  /**
   * Initialize event listeners for UI elements
   * @private
   */
  initializeEventListeners() {
    // Category filters
    this.elements.categoryButtons.forEach(btn => 
      btn.addEventListener('click', () => this.filterMenuItems(btn.dataset.category))
    );

    // Order actions
    this.elements.newOrderBtn.addEventListener('click', () => this.startNewOrder());
    this.elements.holdOrderBtn.addEventListener('click', () => this.holdOrder());
    this.elements.recallOrderBtn.addEventListener('click', () => this.showHeldOrders());
    this.elements.paymentBtn.addEventListener('click', () => this.showPayment());
  }

  /**
   * Load menu items from server
   * @returns {Promise<void>}
   * @private
   */
  async loadMenuItems() {
    this.state.isLoading = true;
    try {
      const response = await fetch('/api/menu/items');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      this.state.menuItems = await response.json();
      this.renderMenuItems();
    } catch (error) {
      throw new Error(`Failed to load menu items: ${error.message}`);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Filter menu items by category
   * @param {string} category - Category to filter by
   */
  filterMenuItems(category) {
    this.state.selectedCategory = category;
    
    // Update UI
    this.elements.categoryButtons.forEach(btn => {
      btn.classList.toggle(UI_CLASSES.ACTIVE, btn.dataset.category === category);
    });

    this.renderMenuItems();
  }

  /**
   * Render menu items in the grid
   * @private
   */
  renderMenuItems() {
    const filteredItems = this.state.selectedCategory === 'all' 
      ? this.state.menuItems 
      : this.state.menuItems.filter(item => item.category === this.state.selectedCategory);

    this.elements.menuItemsGrid.innerHTML = filteredItems.map(item => `
      <div class="menu-item ${item.stock <= 0 ? UI_CLASSES.OUT_OF_STOCK : ''}" 
           data-item-id="${item.id}"
           ${item.stock <= 0 ? 'disabled="true"' : ''}>
        <img src="${item.image}" alt="${item.name}" loading="lazy">
        <h3>${item.name}</h3>
        <p class="price">$${item.price.toFixed(2)}</p>
        ${item.stock <= 5 ? `<span class="low-stock">Only ${item.stock} left</span>` : ''}
      </div>
    `).join('');

    // Add click handlers
    this.elements.menuItemsGrid.querySelectorAll('.menu-item:not([disabled])')
      .forEach(element => {
        element.addEventListener('click', () => 
          this.handleItemClick(element.dataset.itemId)
        );
      });
  }

  /**
   * Handle menu item click
   * @param {string} itemId - ID of clicked item
   * @private
   */
  async handleItemClick(itemId) {
    const item = this.state.menuItems.find(item => item.id === itemId);
    if (!item) return;

    try {
      if (item.customizable) {
        await window.orderManager.showCustomizeModal(item);
      } else {
        await window.orderManager.addItemToOrder(item);
      }
    } catch (error) {
      this.handleError('Failed to add item to order', error);
    }
  }

  /**
   * Start a new order
   */
  startNewOrder() {
    if (this.state.currentOrder.items.length > 0) {
      if (!confirm('Start a new order? Current order will be cleared.')) {
        return;
      }
    }

    this.state.currentOrder = this.createNewOrderState();
    this.elements.orderNumber.textContent = this.state.currentOrder.id;
    this.updateOrderDisplay();
    this.startOrderTimer();
  }

  /**
   * Hold current order
   */
  holdOrder() {
    if (this.state.currentOrder.items.length === 0) {
      this.showError('No items in current order');
      return;
    }

    this.state.heldOrders.push({
      ...this.state.currentOrder,
      heldAt: new Date()
    });

    this.startNewOrder();
    this.showSuccess('Order held successfully');
  }

  /**
   * Show held orders modal
   */
  showHeldOrders() {
    const modal = document.getElementById('heldOrdersModal');
    const list = document.getElementById('heldOrdersList');

    if (!modal || !list) {
      this.showError('Held orders modal not found');
      return;
    }

    list.innerHTML = this.state.heldOrders.map(order => `
      <div class="held-order" data-order-id="${order.id}">
        <div class="held-order-info">
          <h4>Order #${order.id}</h4>
          <p>${order.items.length} items - $${order.total.toFixed(2)}</p>
          <p class="held-time">Held at ${new Date(order.heldAt).toLocaleTimeString()}</p>
        </div>
        <button class="recall-btn">Recall</button>
      </div>
    `).join('') || '<p>No held orders</p>';

    // Add recall handlers
    list.querySelectorAll('.recall-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const orderId = e.target.closest('.held-order').dataset.orderId;
        this.recallOrder(orderId);
        modal.style.display = 'none';
      });
    });

    modal.style.display = 'block';
  }

  /**
   * Recall a held order
   * @param {string} orderId - ID of order to recall
   */
  recallOrder(orderId) {
    const orderIndex = this.state.heldOrders.findIndex(order => order.id === orderId);
    if (orderIndex === -1) {
      this.showError('Order not found');
      return;
    }

    if (this.state.currentOrder.items.length > 0) {
      if (!confirm('Recall this order? Current order will be held.')) {
        return;
      }
      this.holdOrder();
    }

    this.state.currentOrder = this.state.heldOrders[orderIndex];
    this.state.heldOrders.splice(orderIndex, 1);

    this.elements.orderNumber.textContent = this.state.currentOrder.id;
    this.updateOrderDisplay();
    this.startOrderTimer();
  }

  /**
   * Update order display
   * @private
   */
  updateOrderDisplay() {
    window.orderManager.renderOrderItems();
    this.updateTotals();
  }

  /**
   * Update order totals
   * @private
   */
  updateTotals() {
    const subtotal = this.state.currentOrder.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );
    const tax = subtotal * POS_CONFIG.TAX_RATE;
    const total = subtotal + tax - this.state.currentOrder.discount;

    // Update state
    Object.assign(this.state.currentOrder, { subtotal, tax, total });

    // Update UI
    this.elements.subtotal.textContent = `$${subtotal.toFixed(2)}`;
    this.elements.tax.textContent = `$${tax.toFixed(2)}`;
    this.elements.total.textContent = `$${total.toFixed(2)}`;

    // Handle discount display
    const discountElement = document.querySelector('.discount');
    if (this.state.currentOrder.discount > 0) {
      this.elements.discount.textContent = 
        `-$${this.state.currentOrder.discount.toFixed(2)}`;
      discountElement?.classList.remove(UI_CLASSES.HIDDEN);
    } else {
      discountElement?.classList.add(UI_CLASSES.HIDDEN);
    }
  }

  /**
   * Start order timer
   * @private
   */
  startOrderTimer() {
    if (this.orderTimer) {
      clearInterval(this.orderTimer);
    }

    const startTime = Date.now();
    this.orderTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const seconds = (elapsed % 60).toString().padStart(2, '0');
      this.elements.orderTime.textContent = `${hours}:${minutes}:${seconds}`;
    }, POS_CONFIG.ORDER_TIMER_INTERVAL);
  }

  /**
   * Handle real-time updates from WebSocket
   * @param {Object} data - Update data
   * @private
   */
  handleRealtimeUpdate(data) {
    switch (data.type) {
      case WS_EVENTS.MENU_UPDATE:
        this.handleMenuUpdate(data.item);
        break;
      case WS_EVENTS.INVENTORY_UPDATE:
        this.handleInventoryUpdate(data.item);
        break;
      case WS_EVENTS.ORDER_UPDATE:
        this.handleOrderUpdate(data.order);
        break;
      default:
        console.warn('Unknown update type:', data.type);
    }
  }

  /**
   * Handle menu item updates
   * @param {Object} updatedItem - Updated menu item
   * @private
   */
  handleMenuUpdate(updatedItem) {
    const index = this.state.menuItems.findIndex(item => item.id === updatedItem.id);
    if (index !== -1) {
      this.state.menuItems[index] = updatedItem;
      this.renderMenuItems();
    }
  }

  /**
   * Handle inventory updates
   * @param {Object} item - Updated inventory item
   * @private
   */
  handleInventoryUpdate(item) {
    const menuItem = document.querySelector(`[data-item-id="${item.id}"]`);
    if (menuItem) {
      if (item.stock <= 0) {
        menuItem.classList.add(UI_CLASSES.OUT_OF_STOCK);
        menuItem.setAttribute('disabled', 'true');
      } else if (item.stock <= 5) {
        menuItem.querySelector('.low-stock').textContent = 
          `Only ${item.stock} left`;
      }
    }
  }

  /**
   * Handle order updates
   * @param {Object} order - Updated order
   * @private
   */
  handleOrderUpdate(order) {
    if (order.id === this.state.currentOrder.id) {
      this.state.currentOrder = order;
      this.updateOrderDisplay();
    }
  }

  /**
   * Show payment modal
   * @private
   */
  showPayment() {
    if (this.state.currentOrder.items.length === 0) {
      this.showError('No items in current order');
      return;
    }
    window.paymentProcessor.showPaymentModal();
  }

  /**
   * Handle errors
   * @param {string} context - Error context
   * @param {Error} error - Error object
   * @private
   */
  handleError(context, error) {
    console.error(`${context}:`, error);
    this.showError(`${context}: ${error.message}`);
  }

  /**
   * Show error toast
   * @param {string} message - Error message
   */
  showError(message) {
    this.showToast(message, UI_CLASSES.TOAST.ERROR);
  }

  /**
   * Show success toast
   * @param {string} message - Success message
   */
  showSuccess(message) {
    this.showToast(message, UI_CLASSES.TOAST.SUCCESS);
  }

  /**
   * Show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type
   * @private
   */
  showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `${UI_CLASSES.TOAST.BASE} ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), POS_CONFIG.TOAST_DURATION);
  }
}

// Initialize POS system
window.posCore = new POSCore();
