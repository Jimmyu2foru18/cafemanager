/**
 * Payment Processing System
 *
 * This class manages payment processing for the CaféManager application, handling
 * interactions with various payment providers. It provides methods for processing
 * payments, managing receipts, and updating customer loyalty points.
 *
 * Key Features:
 * - **Multi-Provider Support**: Integrates with different payment providers, allowing
 *   flexibility in payment processing options.
 * - **Payment Processing**: Facilitates secure payment transactions and handles errors
 *   gracefully.
 * - **Receipt Generation**: Generates and prints receipts for completed transactions.
 * - **Loyalty Points Management**: Updates customer loyalty points based on payment
 *   transactions.
 *
 * Configuration:
 * The service can be initialized with configuration options, including provider settings
 * and API keys.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate methods for processing
 * payments:
 *
 * ```javascript
 * const paymentProcessor = new PaymentProcessor();
 * paymentProcessor.processPayment(orderData);
 * ```
 *
 * Ensure that the necessary API keys and environment settings are configured before
 * using this service.
 */

// Configuration constants
const PAYMENT_CONFIG = {
  MIN_AMOUNT: 0.01,
  QUICK_AMOUNT_MULTIPLIERS: [1, 5, 10, 20],
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  API_ENDPOINTS: {
    PROCESS_PAYMENT: '/api/payments/process',
    PRINT_RECEIPT: '/api/receipts/print',
    UPDATE_LOYALTY: '/api/customers/loyalty/update',
    GENERATE_QR: '/api/payments/qr-code'
  }
};

// Payment methods configuration
const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  MOBILE: 'mobile'
};

// CSS classes and selectors
const UI_CLASSES = {
  ACTIVE: 'active',
  HIDDEN: 'hidden',
  PROCESSING: 'processing',
  ERROR: 'error'
};

/**
 * Payment Processor class for handling all payment-related operations
 * @class PaymentProcessor
 */
class PaymentProcessor {
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
    if (!window.posCore || !window.orderManager) {
      throw new Error('POSCore and OrderManager must be initialized before PaymentProcessor');
    }
  }

  /**
   * Initialize processor when DOM is ready
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
   * Initialize payment processor
   * @private
   */
  initialize() {
    this.bindElements();
    this.initializeState();
    this.initializeEventListeners();
  }

  /**
   * Bind DOM elements
   * @private
   * @throws {Error} If required elements are not found
   */
  bindElements() {
    this.elements = {
      paymentModal: document.getElementById('paymentModal'),
      paymentMethods: document.querySelector('.payment-methods'),
      paymentDetails: document.querySelector('.payment-details'),
      processPaymentBtn: document.getElementById('processPayment'),
      cancelPaymentBtn: document.getElementById('cancelPayment'),
      closeBtn: document.querySelector('#paymentModal .close-btn')
    };

    // Validate required elements
    Object.entries(this.elements).forEach(([key, element]) => {
      if (!element) {
        throw new Error(`Required payment element not found: ${key}`);
      }
    });
  }

  /**
   * Initialize payment state
   * @private
   */
  initializeState() {
    this.state = {
      selectedMethod: PAYMENT_METHODS.CASH,
      processingPayment: false,
      retryCount: 0
    };
  }

  /**
   * Initialize event listeners
   * @private
   */
  initializeEventListeners() {
    // Payment method selection
    this.elements.paymentMethods.querySelectorAll('.payment-method-btn')
      .forEach(btn => {
        btn.addEventListener('click', () => 
          this.selectPaymentMethod(btn.dataset.method)
        );
      });

    // Payment actions
    this.elements.processPaymentBtn.addEventListener('click', 
      () => this.processPayment()
    );
    this.elements.cancelPaymentBtn.addEventListener('click', 
      () => this.hidePaymentModal()
    );
    this.elements.closeBtn.addEventListener('click', 
      () => this.hidePaymentModal()
    );

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalVisible()) {
        this.hidePaymentModal();
      }
    });
  }

  /**
   * Check if payment modal is visible
   * @returns {boolean} True if modal is visible
   * @private
   */
  isModalVisible() {
    return this.elements.paymentModal.style.display === 'block';
  }

  /**
   * Show payment modal
   * @public
   */
  showPaymentModal() {
    const order = window.posCore.state.currentOrder;
    
    if (!this.validateOrder(order)) {
      return;
    }

    this.selectPaymentMethod(PAYMENT_METHODS.CASH);
    this.elements.paymentModal.style.display = 'block';
  }

  /**
   * Validate order before payment
   * @param {Object} order - Order to validate
   * @returns {boolean} True if order is valid
   * @private
   */
  validateOrder(order) {
    if (!order.items.length) {
      window.posCore.showError('No items in order');
      return false;
    }

    if (order.total < PAYMENT_CONFIG.MIN_AMOUNT) {
      window.posCore.showError('Invalid order total');
      return false;
    }

    return true;
  }

  /**
   * Hide payment modal
   * @public
   */
  hidePaymentModal() {
    this.elements.paymentModal.style.display = 'none';
    this.state.processingPayment = false;
    this.state.retryCount = 0;
  }

  /**
   * Select payment method
   * @param {string} method - Payment method to select
   * @private
   */
  selectPaymentMethod(method) {
    if (!Object.values(PAYMENT_METHODS).includes(method)) {
      console.warn(`Invalid payment method: ${method}`);
      return;
    }

    this.state.selectedMethod = method;

    // Update UI
    this.elements.paymentMethods.querySelectorAll('.payment-method-btn')
      .forEach(btn => {
        btn.classList.toggle(UI_CLASSES.ACTIVE, btn.dataset.method === method);
      });

    // Update payment details
    this.elements.paymentDetails.innerHTML = this.getPaymentDetailsHTML(method);

    // Setup method-specific handlers
    this.setupPaymentMethodHandlers(method);
  }

  /**
   * Set up payment method specific handlers
   * @param {string} method - Payment method
   * @private
   */
  setupPaymentMethodHandlers(method) {
    if (method === PAYMENT_METHODS.CASH) {
      const amountInput = document.getElementById('cashAmount');
      if (amountInput) {
        amountInput.addEventListener('input', () => this.updateChangeAmount());
        amountInput.focus();

        // Setup quick amount buttons
        document.querySelectorAll('.quick-amount').forEach(btn => {
          btn.addEventListener('click', () => {
            amountInput.value = btn.dataset.amount;
            this.updateChangeAmount();
          });
        });
      }
    }
  }

  /**
   * Get payment details HTML
   * @param {string} method - Payment method
   * @returns {string} HTML for payment details
   * @private
   */
  getPaymentDetailsHTML(method) {
    const total = window.posCore.state.currentOrder.total;

    switch (method) {
      case PAYMENT_METHODS.CASH:
        return this.getCashPaymentHTML(total);
      case PAYMENT_METHODS.CARD:
        return this.getCardPaymentHTML(total);
      case PAYMENT_METHODS.MOBILE:
        return this.getMobilePaymentHTML(total);
      default:
        return '';
    }
  }

  /**
   * Get cash payment HTML
   * @param {number} total - Order total
   * @returns {string} HTML for cash payment
   * @private
   */
  getCashPaymentHTML(total) {
    return `
      <div class="cash-payment">
        <div class="amount-due">
          <h4>Amount Due</h4>
          <p class="total">$${total.toFixed(2)}</p>
        </div>
        <div class="cash-input">
          <label for="cashAmount">Cash Received</label>
          <div class="amount-input">
            <span class="currency">$</span>
            <input type="number" 
                   id="cashAmount" 
                   step="0.01" 
                   min="${total.toFixed(2)}"
                   value="${total.toFixed(2)}"
                   autocomplete="off">
          </div>
        </div>
        <div class="change-due">
          <h4>Change Due</h4>
          <p id="changeDue">$0.00</p>
        </div>
        <div class="quick-amounts">
          ${this.generateQuickAmounts(total)}
        </div>
      </div>
    `;
  }

  /**
   * Get card payment HTML
   * @param {number} total - Order total
   * @returns {string} HTML for card payment
   * @private
   */
  getCardPaymentHTML(total) {
    return `
      <div class="card-payment">
        <div class="amount-due">
          <h4>Amount to Charge</h4>
          <p class="total">$${total.toFixed(2)}</p>
        </div>
        <div class="card-instructions">
          <p>Please insert, tap, or swipe card</p>
          <i class="fas fa-credit-card fa-3x"></i>
        </div>
        <div class="card-status"></div>
      </div>
    `;
  }

  /**
   * Get mobile payment HTML
   * @param {number} total - Order total
   * @returns {string} HTML for mobile payment
   * @private
   */
  getMobilePaymentHTML(total) {
    return `
      <div class="mobile-payment">
        <div class="amount-due">
          <h4>Amount to Pay</h4>
          <p class="total">$${total.toFixed(2)}</p>
        </div>
        <div class="qr-code">
          <img src="${PAYMENT_CONFIG.API_ENDPOINTS.GENERATE_QR}?amount=${total}" 
               alt="QR Code for Payment">
        </div>
        <p>Scan QR code to pay with your mobile device</p>
      </div>
    `;
  }

  /**
   * Generate quick amount buttons
   * @param {number} total - Order total
   * @returns {string} HTML for quick amount buttons
   * @private
   */
  generateQuickAmounts(total) {
    const amounts = PAYMENT_CONFIG.QUICK_AMOUNT_MULTIPLIERS.map(multiplier => 
      Math.ceil(total / multiplier) * multiplier
    );

    return `
      <div class="quick-amount-buttons">
        ${amounts.map(amount => `
          <button class="quick-amount" data-amount="${amount}">
            $${amount.toFixed(2)}
          </button>
        `).join('')}
      </div>
    `;
  }

  /**
   * Update change amount display
   * @private
   */
  updateChangeAmount() {
    const amountInput = document.getElementById('cashAmount');
    const changeDue = document.getElementById('changeDue');
    
    if (!amountInput || !changeDue) return;

    const received = parseFloat(amountInput.value) || 0;
    const total = window.posCore.state.currentOrder.total;
    const change = Math.max(0, received - total);
    
    changeDue.textContent = `$${change.toFixed(2)}`;
    
    // Validate input
    if (received < total) {
      amountInput.classList.add(UI_CLASSES.ERROR);
    } else {
      amountInput.classList.remove(UI_CLASSES.ERROR);
    }
  }

  /**
   * Process payment
   * @returns {Promise<void>}
   * @public
   */
  async processPayment() {
    if (this.state.processingPayment) return;
    
    try {
      this.state.processingPayment = true;
      this.elements.processPaymentBtn.classList.add(UI_CLASSES.PROCESSING);

      const paymentData = this.preparePaymentData();
      if (!this.validatePaymentData(paymentData)) {
        return;
      }

      const result = await this.submitPayment(paymentData);
      await this.handlePaymentSuccess(result);
    } catch (error) {
      await this.handlePaymentError(error);
    } finally {
      this.elements.processPaymentBtn.classList.remove(UI_CLASSES.PROCESSING);
    }
  }

  /**
   * Prepare payment data
   * @returns {Object} Payment data
   * @private
   */
  preparePaymentData() {
    const order = window.posCore.state.currentOrder;
    const paymentData = {
      orderId: order.id,
      amount: order.total,
      method: this.state.selectedMethod,
      customerId: order.customer?.id,
      timestamp: new Date().toISOString()
    };

    if (this.state.selectedMethod === PAYMENT_METHODS.CASH) {
      const cashAmount = parseFloat(document.getElementById('cashAmount').value);
      paymentData.cashReceived = cashAmount;
    }

    return paymentData;
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   * @returns {boolean} True if payment data is valid
   * @private
   */
  validatePaymentData(paymentData) {
    if (this.state.selectedMethod === PAYMENT_METHODS.CASH) {
      if (isNaN(paymentData.cashReceived) || 
          paymentData.cashReceived < paymentData.amount) {
        window.posCore.showError('Invalid cash amount');
        this.state.processingPayment = false;
        return false;
      }
    }
    return true;
  }

  /**
   * Submit payment to server
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment result
   * @private
   */
  async submitPayment(paymentData) {
    const response = await fetch(PAYMENT_CONFIG.API_ENDPOINTS.PROCESS_PAYMENT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(paymentData)
    });

    if (!response.ok) {
      throw new Error(`Payment failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Handle successful payment
   * @param {Object} paymentResult - Payment result
   * @returns {Promise<void>}
   * @private
   */
  async handlePaymentSuccess(paymentResult) {
    try {
      await Promise.all([
        this.printReceipt(paymentResult),
        this.updateLoyaltyPoints(paymentResult)
      ]);

      window.posCore.startNewOrder();
      window.posCore.showSuccess('Payment processed successfully');
      this.hidePaymentModal();
    } catch (error) {
      console.error('Post-payment processing error:', error);
      // Continue with success flow even if receipt/loyalty fails
    }
  }

  /**
   * Handle payment error
   * @param {Error} error - Error object
   * @returns {Promise<void>}
   * @private
   */
  async handlePaymentError(error) {
    console.error('Payment processing error:', error);
    
    if (this.state.retryCount < PAYMENT_CONFIG.RETRY_ATTEMPTS) {
      this.state.retryCount++;
      window.posCore.showError(
        `Payment failed. Retrying (${this.state.retryCount}/${PAYMENT_CONFIG.RETRY_ATTEMPTS})...`
      );
      await new Promise(resolve => 
        setTimeout(resolve, PAYMENT_CONFIG.RETRY_DELAY)
      );
      await this.processPayment();
    } else {
      window.posCore.showError('Payment processing failed');
      this.state.processingPayment = false;
      this.state.retryCount = 0;
    }
  }

  /**
   * Print receipt
   * @param {Object} paymentResult - Payment result
   * @returns {Promise<void>}
   * @private
   */
  async printReceipt(paymentResult) {
    try {
      const response = await fetch(PAYMENT_CONFIG.API_ENDPOINTS.PRINT_RECEIPT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentResult)
      });

      if (!response.ok) {
        throw new Error('Failed to print receipt');
      }
    } catch (error) {
      console.error('Receipt printing error:', error);
      window.posCore.showError('Failed to print receipt');
    }
  }

  /**
   * Update customer loyalty points
   * @param {Object} paymentResult - Payment result
   * @returns {Promise<void>}
   * @private
   */
  async updateLoyaltyPoints(paymentResult) {
    const customer = window.posCore.state.currentOrder.customer;
    if (!customer) return;

    try {
      const response = await fetch(PAYMENT_CONFIG.API_ENDPOINTS.UPDATE_LOYALTY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: customer.id,
          orderId: paymentResult.orderId,
          amount: paymentResult.amount,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update loyalty points');
      }
    } catch (error) {
      console.error('Loyalty points update error:', error);
      // Don't show error to user as this is not critical
    }
  }
}

// Initialize Payment Processor
window.paymentProcessor = new PaymentProcessor();
