/**
 * Order Management System
 * Handles order creation, modification, customization, and item management
 * @module OrderManager
 */

// Configuration constants
const ORDER_CONFIG = {
  MIN_QUANTITY: 1,
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 250
};

// CSS classes for UI elements
const UI_CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  LOADING: 'loading',
  MODIFIED: 'modified',
  HIGHLIGHT: 'highlight'
};

// Event names for custom events
const ORDER_EVENTS = {
  ITEM_ADDED: 'order:item-added',
  ITEM_REMOVED: 'order:item-removed',
  QUANTITY_CHANGED: 'order:quantity-changed',
  CUSTOMIZATION_UPDATED: 'order:customization-updated'
};

/**
 * Order Manager class for handling all order-related operations
 * @class OrderManager
 */
class OrderManager {
  constructor() {
    this.validateDependencies();
    this.initializeOnDOMReady();
  }

  /**
   * Validate required dependencies
   * @private
   * @throws {Error} If required dependencies are not initialized
   */
  validateDependencies() {
    if (!window.posCore) {
      throw new Error('POSCore must be initialized before OrderManager');
    }
  }

  /**
   * Initialize manager when DOM is ready
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
   * Initialize order manager
   * @private
   */
  initialize() {
    this.bindElements();
    this.initializeState();
    this.initializeEventListeners();
    this.setupDebouncing();
  }

  /**
   * Bind DOM elements
   * @private
   * @throws {Error} If required elements are not found
   */
  bindElements() {
    this.elements = {
      orderItems: document.getElementById('orderItems'),
      customizeModal: document.getElementById('customizeModal'),
      modalBody: document.querySelector('#customizeModal .modal-body'),
      addToOrderBtn: document.getElementById('addToOrder'),
      cancelCustomizationBtn: document.getElementById('cancelCustomization'),
      closeModalBtn: document.querySelector('#customizeModal .close-btn')
    };

    // Validate required elements
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        throw new Error(`Required order element not found: ${key}`);
      }
    });
  }

  /**
   * Initialize order state
   * @private
   */
  initializeState() {
    this.customizing = {
      item: null,
      options: {},
      originalPrice: 0
    };

    // Setup performance optimizations
    this.debouncedRender = null;
    this.renderQueue = new Set();
    this.animationFrame = null;
  }

  /**
   * Setup debouncing for expensive operations
   * @private
   */
  setupDebouncing() {
    this.debouncedRender = this.debounce(() => {
      this.renderOrderItems();
    }, ORDER_CONFIG.DEBOUNCE_DELAY);
  }

  /**
   * Initialize event listeners
   * @private
   */
  initializeEventListeners() {
    // Customize modal events
    this.elements.addToOrderBtn.addEventListener('click', 
      () => this.addCustomizedItemToOrder()
    );
    this.elements.cancelCustomizationBtn.addEventListener('click', 
      () => this.hideCustomizeModal()
    );
    this.elements.closeModalBtn.addEventListener('click', 
      () => this.hideCustomizeModal()
    );

    // Handle escape key for modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalVisible()) {
        this.hideCustomizeModal();
      }
    });

    // Handle custom events
    Object.values(ORDER_EVENTS).forEach(eventName => {
      document.addEventListener(eventName, (e) => this.handleOrderEvent(e));
    });
  }

  /**
   * Show customization modal for an item
   * @param {Object} item - Menu item to customize
   * @public
   */
  showCustomizeModal(item) {
    if (!item || !item.customization_options) {
      console.warn('Invalid item or no customization options');
      return;
    }

    this.customizing.item = item;
    this.customizing.options = {};
    this.customizing.originalPrice = item.price;

    this.renderCustomizationOptions(item);
    this.elements.customizeModal.style.display = 'block';
    
    // Focus first input
    setTimeout(() => {
      const firstInput = this.elements.modalBody.querySelector('input, select');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  /**
   * Render customization options
   * @param {Object} item - Menu item
   * @private
   */
  renderCustomizationOptions(item) {
    this.elements.modalBody.innerHTML = `
      <div class="customize-options">
        ${this.generateCustomizationHTML(item.customization_options)}
      </div>
      <div class="customize-preview">
        <h4>Price: $<span id="customizePrice">${item.price.toFixed(2)}</span></h4>
      </div>
    `;

    // Add event listeners to options
    this.elements.modalBody.querySelectorAll('input, select').forEach(element => {
      element.addEventListener('change', (e) => this.handleOptionChange(e));
    });
  }

  /**
   * Generate HTML for customization options
   * @param {Object} options - Customization options
   * @returns {string} HTML string
   * @private
   */
  generateCustomizationHTML(options) {
    return Object.entries(options).map(([category, choices]) => `
      <div class="customize-category">
        <h4>${this.capitalizeFirst(category)}</h4>
        ${this.generateChoicesHTML(category, choices)}
      </div>
    `).join('');
  }

  /**
   * Generate HTML for customization choices
   * @param {string} category - Option category
   * @param {Array|Object} choices - Available choices
   * @returns {string} HTML string
   * @private
   */
  generateChoicesHTML(category, choices) {
    if (Array.isArray(choices)) {
      return this.generateMultipleChoiceHTML(category, choices);
    } else {
      return this.generateSingleChoiceHTML(category, choices);
    }
  }

  /**
   * Generate HTML for multiple choice options
   * @param {string} category - Option category
   * @param {Array} choices - Available choices
   * @returns {string} HTML string
   * @private
   */
  generateMultipleChoiceHTML(category, choices) {
    return choices.map(choice => `
      <label class="choice-label">
        <input type="checkbox" 
               name="${category}" 
               value="${choice.name}"
               data-price="${choice.price || 0}">
        ${choice.name} ${choice.price ? `(+$${choice.price.toFixed(2)})` : ''}
      </label>
    `).join('');
  }

  /**
   * Generate HTML for single choice options
   * @param {string} category - Option category
   * @param {Object} choices - Available choices
   * @returns {string} HTML string
   * @private
   */
  generateSingleChoiceHTML(category, choices) {
    return `
      <select name="${category}">
        ${Object.entries(choices).map(([name, price]) => `
          <option value="${name}" data-price="${price || 0}">
            ${name} ${price ? `(+$${price.toFixed(2)})` : ''}
          </option>
        `).join('')}
      </select>
    `;
  }

  /**
   * Handle option change event
   * @param {Event} event - Change event
   * @private
   */
  handleOptionChange(event) {
    const element = event.target;
    const category = element.name;
    const value = element.value;
    const price = parseFloat(element.dataset.price) || 0;

    if (element.type === 'checkbox') {
      this.handleCheckboxChange(category, value, price, element.checked);
    } else {
      this.handleSelectChange(category, value, price);
    }

    this.updateCustomizePreview();
    this.dispatchEvent(ORDER_EVENTS.CUSTOMIZATION_UPDATED, {
      item: this.customizing.item,
      options: this.customizing.options
    });
  }

  /**
   * Handle checkbox option change
   * @param {string} category - Option category
   * @param {string} value - Option value
   * @param {number} price - Option price
   * @param {boolean} checked - Checkbox state
   * @private
   */
  handleCheckboxChange(category, value, price, checked) {
    if (!this.customizing.options[category]) {
      this.customizing.options[category] = [];
    }

    if (checked) {
      this.customizing.options[category].push({
        name: value,
        price: price
      });
    } else {
      this.customizing.options[category] = this.customizing.options[category]
        .filter(option => option.name !== value);
    }
  }

  /**
   * Handle select option change
   * @param {string} category - Option category
   * @param {string} value - Option value
   * @param {number} price - Option price
   * @private
   */
  handleSelectChange(category, value, price) {
    this.customizing.options[category] = {
      name: value,
      price: price
    };
  }

  /**
   * Update customization preview
   * @private
   */
  updateCustomizePreview() {
    const totalPrice = this.calculateCustomizedPrice();
    const priceElement = document.getElementById('customizePrice');
    
    if (priceElement) {
      priceElement.textContent = totalPrice.toFixed(2);
      
      // Highlight price if changed
      if (totalPrice !== this.customizing.originalPrice) {
        priceElement.classList.add(UI_CLASSES.MODIFIED);
      } else {
        priceElement.classList.remove(UI_CLASSES.MODIFIED);
      }
    }
  }

  /**
   * Calculate total price with customizations
   * @returns {number} Total price
   * @private
   */
  calculateCustomizedPrice() {
    const basePrice = this.customizing.originalPrice;
    const optionsPrice = Object.values(this.customizing.options)
      .flat()
      .reduce((sum, option) => sum + (option.price || 0), 0);

    return basePrice + optionsPrice;
  }

  /**
   * Hide customization modal
   * @public
   */
  hideCustomizeModal() {
    this.elements.customizeModal.style.display = 'none';
    this.customizing.item = null;
    this.customizing.options = {};
    this.customizing.originalPrice = 0;
  }

  /**
   * Add customized item to order
   * @public
   */
  addCustomizedItemToOrder() {
    if (!this.customizing.item) return;

    const customizedItem = {
      ...this.customizing.item,
      quantity: ORDER_CONFIG.MIN_QUANTITY,
      customization: this.customizing.options,
      price: this.calculateCustomizedPrice()
    };

    this.addItemToOrder(customizedItem);
    this.hideCustomizeModal();
  }

  /**
   * Add item to order
   * @param {Object} item - Item to add
   * @public
   */
  addItemToOrder(item) {
    const order = window.posCore.state.currentOrder;
    const existingIndex = this.findExistingItemIndex(item);

    if (existingIndex !== -1) {
      order.items[existingIndex].quantity++;
    } else {
      order.items.push({ ...item, quantity: ORDER_CONFIG.MIN_QUANTITY });
    }

    this.debouncedRender();
    window.posCore.updateTotals();
    this.dispatchEvent(ORDER_EVENTS.ITEM_ADDED, { item });
  }

  /**
   * Find existing item index in order
   * @param {Object} item - Item to find
   * @returns {number} Item index or -1 if not found
   * @private
   */
  findExistingItemIndex(item) {
    return window.posCore.state.currentOrder.items.findIndex(orderItem => 
      orderItem.id === item.id && 
      JSON.stringify(orderItem.customization) === JSON.stringify(item.customization)
    );
  }

  /**
   * Remove item from order
   * @param {number} index - Item index
   * @public
   */
  removeItemFromOrder(index) {
    const order = window.posCore.state.currentOrder;
    const removedItem = order.items[index];
    
    order.items.splice(index, 1);
    this.debouncedRender();
    window.posCore.updateTotals();
    
    this.dispatchEvent(ORDER_EVENTS.ITEM_REMOVED, { 
      item: removedItem,
      index: index 
    });
  }

  /**
   * Update item quantity
   * @param {number} index - Item index
   * @param {number} delta - Quantity change
   * @public
   */
  updateItemQuantity(index, delta) {
    const order = window.posCore.state.currentOrder;
    const item = order.items[index];
    const newQuantity = Math.max(ORDER_CONFIG.MIN_QUANTITY, item.quantity + delta);
    
    if (newQuantity !== item.quantity) {
      item.quantity = newQuantity;
      this.debouncedRender();
      window.posCore.updateTotals();
      
      this.dispatchEvent(ORDER_EVENTS.QUANTITY_CHANGED, {
        item: item,
        index: index,
        oldQuantity: item.quantity - delta,
        newQuantity: item.quantity
      });
    }
  }

  /**
   * Render order items with optimizations
   * @private
   */
  renderOrderItems() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    this.animationFrame = requestAnimationFrame(() => {
      const items = window.posCore.state.currentOrder.items;
      
      this.elements.orderItems.innerHTML = items.map((item, index) => 
        this.generateOrderItemHTML(item, index)
      ).join('');

      this.setupOrderItemHandlers();
      this.animationFrame = null;
    });
  }

  /**
   * Generate HTML for order item
   * @param {Object} item - Order item
   * @param {number} index - Item index
   * @returns {string} HTML string
   * @private
   */
  generateOrderItemHTML(item, index) {
    const itemTotal = (item.price * item.quantity).toFixed(2);
    const customizationSummary = this.generateCustomizationSummary(item.customization);

    return `
      <div class="order-item" data-index="${index}">
        <div class="item-details">
          <h4>${item.name}</h4>
          ${customizationSummary}
          <div class="item-price">$${itemTotal}</div>
        </div>
        <div class="item-actions">
          <button class="quantity-btn minus" data-index="${index}">-</button>
          <span class="quantity">${item.quantity}</span>
          <button class="quantity-btn plus" data-index="${index}">+</button>
          <button class="remove-btn" data-index="${index}">×</button>
        </div>
      </div>
    `;
  }

  /**
   * Generate customization summary
   * @param {Object} customization - Item customization
   * @returns {string} HTML string
   * @private
   */
  generateCustomizationSummary(customization) {
    if (!customization || Object.keys(customization).length === 0) {
      return '';
    }

    const summary = Object.entries(customization)
      .map(([category, options]) => {
        const optionNames = Array.isArray(options) 
          ? options.map(opt => opt.name).join(', ')
          : options.name;
        return `${this.capitalizeFirst(category)}: ${optionNames}`;
      })
      .join(' | ');

    return `<div class="customization-summary">${summary}</div>`;
  }

  /**
   * Setup handlers for order item elements
   * @private
   */
  setupOrderItemHandlers() {
    const orderItems = this.elements.orderItems;

    orderItems.querySelectorAll('.quantity-btn.minus').forEach(btn => {
      btn.addEventListener('click', () => 
        this.updateItemQuantity(parseInt(btn.dataset.index), -1)
      );
    });

    orderItems.querySelectorAll('.quantity-btn.plus').forEach(btn => {
      btn.addEventListener('click', () => 
        this.updateItemQuantity(parseInt(btn.dataset.index), 1)
      );
    });

    orderItems.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => 
        this.removeItemFromOrder(parseInt(btn.dataset.index))
      );
    });
  }

  /**
   * Handle order events
   * @param {CustomEvent} event - Order event
   * @private
   */
  handleOrderEvent(event) {
    // Handle any additional logic needed for order events
    console.debug('Order event:', event.type, event.detail);
  }

  /**
   * Dispatch custom order event
   * @param {string} eventName - Event name
   * @param {Object} detail - Event details
   * @private
   */
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }

  /**
   * Capitalize first letter of string
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   * @private
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} Debounced function
   * @private
   */
  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  /**
   * Check if customization modal is visible
   * @returns {boolean} Modal visibility
   * @private
   */
  isModalVisible() {
    return this.elements.customizeModal.style.display === 'block';
  }
}

// Initialize Order Manager
window.orderManager = new OrderManager();
