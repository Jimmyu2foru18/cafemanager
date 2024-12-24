/**
 * Admin Dashboard System
 * Handles real-time analytics, reporting, and administrative functions
 * @module AdminDashboard
 */

// Renamed to adminDashboard.js

// Configuration constants
const DASHBOARD_CONFIG = {
  WEBSOCKET_RETRY_DELAY: 5000,
  DEBOUNCE_DELAY: 300,
  CHART_ANIMATION_DURATION: 750,
  REFRESH_INTERVAL: 300000, // 5 minutes
  API_ENDPOINTS: {
    STATS: '/api/admin/stats',
    SALES: '/api/admin/sales',
    POPULAR_ITEMS: '/api/admin/popular-items',
    RECENT_ACTIVITY: '/api/admin/recent-activity',
    ALERTS: '/api/admin/alerts'
  }
};

// Chart configuration
const CHART_CONFIG = {
  SALES: {
    type: 'line',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: DASHBOARD_CONFIG.CHART_ANIMATION_DURATION
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      }
    }
  },
  POPULAR_ITEMS: {
    type: 'bar',
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: DASHBOARD_CONFIG.CHART_ANIMATION_DURATION
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            drawBorder: false
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  }
};

// CSS classes for UI elements
const UI_CLASSES = {
  ACTIVE: 'active',
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info'
};

/**
 * Admin Dashboard class for handling all administrative functions
 * @class AdminDashboard
 */
class AdminDashboard {
  constructor() {
    this.initializeState();
    this.initializeWebSocket();
    this.bindElements();
    this.initializeEventListeners();
    this.initializeCharts();
    this.setupAutoRefresh();
    this.loadInitialData().catch(error => 
      this.handleError('Failed to load initial data', error)
    );
  }

  /**
   * Initialize dashboard state
   * @private
   */
  initializeState() {
    this.state = {
      stats: {
        todaySales: 0,
        activeOrders: 0,
        newCustomers: 0,
        lowStockItems: 0
      },
      selectedPeriod: 'day',
      selectedCategory: 'all',
      isLoading: false,
      lastUpdate: null,
      error: null
    };

    this.charts = {
      sales: null,
      popularItems: null
    };

    this.debouncedSearch = this.debounce(
      this.handleSearch.bind(this),
      DASHBOARD_CONFIG.DEBOUNCE_DELAY
    );
  }

  /**
   * Initialize WebSocket connection with retry mechanism
   * @private
   */
  initializeWebSocket() {
    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/admin`;
      
      this.socket = new WebSocket(wsUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.handleError('WebSocket initialization failed', error);
      setTimeout(() => this.initializeWebSocket(), 
        DASHBOARD_CONFIG.WEBSOCKET_RETRY_DELAY
      );
    }
  }

  /**
   * Set up WebSocket event handlers
   * @private
   */
  setupWebSocketHandlers() {
    this.socket.onopen = () => {
      console.debug('WebSocket connected');
      this.showNotification('Connected to real-time updates', 'success');
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
      console.debug('WebSocket disconnected');
      this.showNotification('Connection lost. Reconnecting...', 'warning');
      setTimeout(() => this.initializeWebSocket(), 
        DASHBOARD_CONFIG.WEBSOCKET_RETRY_DELAY
      );
    };

    this.socket.onerror = (error) => {
      this.handleError('WebSocket error', error);
    };
  }

  /**
   * Bind DOM elements
   * @private
   */
  bindElements() {
    this.elements = {
      stats: {
        todaySales: document.querySelector('.stat-card:nth-child(1) .stat-value'),
        activeOrders: document.querySelector('.stat-card:nth-child(2) .stat-value'),
        newCustomers: document.querySelector('.stat-card:nth-child(3) .stat-value'),
        lowStockItems: document.querySelector('.stat-card:nth-child(4) .stat-value')
      },
      charts: {
        sales: document.getElementById('salesChart'),
        popularItems: document.getElementById('popularItemsChart')
      },
      periodButtons: document.querySelectorAll('.chart-period'),
      categoryFilter: document.getElementById('categoryFilter'),
      searchInput: document.querySelector('.search-bar input'),
      notificationsToggle: document.querySelector('.notifications'),
      recentActivity: document.getElementById('recentActivity'),
      alertsList: document.getElementById('alertsList'),
      loadingIndicator: document.querySelector('.loading-indicator')
    };
  }

  /**
   * Initialize event listeners
   * @private
   */
  initializeEventListeners() {
    // Period selection
    this.elements.periodButtons.forEach(btn => 
      btn.addEventListener('click', (e) => this.handlePeriodChange(e))
    );

    // Category filter
    this.elements.categoryFilter.addEventListener('change', 
      (e) => this.handleCategoryChange(e)
    );

    // Search
    this.elements.searchInput.addEventListener('input', 
      (e) => this.debouncedSearch(e.target.value)
    );

    // Notifications
    this.elements.notificationsToggle.addEventListener('click',
      () => this.toggleNotifications()
    );
  }

  /**
   * Initialize charts
   * @private
   */
  initializeCharts() {
    // Sales Chart
    const salesCtx = this.elements.charts.sales.getContext('2d');
    this.charts.sales = new Chart(salesCtx, {
      type: CHART_CONFIG.SALES.type,
      data: {
        labels: [],
        datasets: [{
          label: 'Sales',
          data: [],
          borderColor: '#2ecc71',
          tension: 0.4,
          fill: false
        }]
      },
      options: CHART_CONFIG.SALES.options
    });

    // Popular Items Chart
    const itemsCtx = this.elements.charts.popularItems.getContext('2d');
    this.charts.popularItems = new Chart(itemsCtx, {
      type: CHART_CONFIG.POPULAR_ITEMS.type,
      data: {
        labels: [],
        datasets: [{
          label: 'Orders',
          data: [],
          backgroundColor: '#3498db'
        }]
      },
      options: CHART_CONFIG.POPULAR_ITEMS.options
    });
  }

  /**
   * Set up auto-refresh for dashboard data
   * @private
   */
  setupAutoRefresh() {
    setInterval(() => {
      if (!document.hidden) {
        this.refreshData();
      }
    }, DASHBOARD_CONFIG.REFRESH_INTERVAL);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshData();
      }
    });
  }

  /**
   * Refresh all dashboard data
   * @private
   */
  async refreshData() {
    try {
      const [stats, salesData, popularItems] = await Promise.all([
        this.fetchStats(),
        this.fetchSalesData(this.state.selectedPeriod),
        this.fetchPopularItems(this.state.selectedCategory)
      ]);

      this.updateStats(stats);
      this.updateSalesChart(salesData);
      this.updatePopularItemsChart(popularItems);
      this.state.lastUpdate = new Date();
    } catch (error) {
      this.handleError('Failed to refresh data', error);
    }
  }

  /**
   * Load initial dashboard data
   * @returns {Promise<void>}
   * @private
   */
  async loadInitialData() {
    this.setLoading(true);

    try {
      await Promise.all([
        this.refreshData(),
        this.loadRecentActivity(),
        this.loadAlerts()
      ]);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Fetch dashboard statistics
   * @returns {Promise<Object>}
   * @private
   */
  async fetchStats() {
    const response = await fetch(DASHBOARD_CONFIG.API_ENDPOINTS.STATS);
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  }

  /**
   * Fetch sales data for specified period
   * @param {string} period - Time period
   * @returns {Promise<Object>}
   * @private
   */
  async fetchSalesData(period) {
    const response = await fetch(
      `${DASHBOARD_CONFIG.API_ENDPOINTS.SALES}?period=${period}`
    );
    if (!response.ok) throw new Error('Failed to fetch sales data');
    return response.json();
  }

  /**
   * Fetch popular items for specified category
   * @param {string} category - Item category
   * @returns {Promise<Object>}
   * @private
   */
  async fetchPopularItems(category) {
    const response = await fetch(
      `${DASHBOARD_CONFIG.API_ENDPOINTS.POPULAR_ITEMS}?category=${category}`
    );
    if (!response.ok) throw new Error('Failed to fetch popular items');
    return response.json();
  }

  /**
   * Update dashboard statistics
   * @param {Object} stats - Statistics data
   * @private
   */
  updateStats(stats) {
    this.state.stats = stats;
    
    Object.entries(stats).forEach(([key, value]) => {
      const element = this.elements.stats[key];
      if (element) {
        element.textContent = this.formatStatValue(key, value);
      }
    });
  }

  /**
   * Format statistic value for display
   * @param {string} key - Statistic key
   * @param {number} value - Statistic value
   * @returns {string} Formatted value
   * @private
   */
  formatStatValue(key, value) {
    switch (key) {
      case 'todaySales':
        return `$${value.toFixed(2)}`;
      default:
        return value.toString();
    }
  }

  /**
   * Update sales chart
   * @param {Object} data - Sales data
   * @private
   */
  updateSalesChart(data) {
    this.charts.sales.data.labels = data.labels;
    this.charts.sales.data.datasets[0].data = data.values;
    this.charts.sales.update('none'); // Disable animation for performance
  }

  /**
   * Update popular items chart
   * @param {Object} data - Popular items data
   * @private
   */
  updatePopularItemsChart(data) {
    this.charts.popularItems.data.labels = data.labels;
    this.charts.popularItems.data.datasets[0].data = data.values;
    this.charts.popularItems.update('none'); // Disable animation for performance
  }

  /**
   * Load recent activity
   * @returns {Promise<void>}
   * @private
   */
  async loadRecentActivity() {
    try {
      const response = await fetch(DASHBOARD_CONFIG.API_ENDPOINTS.RECENT_ACTIVITY);
      if (!response.ok) throw new Error('Failed to fetch recent activity');
      
      const activities = await response.json();
      this.renderActivityList(activities);
    } catch (error) {
      this.handleError('Failed to load recent activity', error);
    }
  }

  /**
   * Render activity list
   * @param {Array} activities - Activity data
   * @private
   */
  renderActivityList(activities) {
    this.elements.recentActivity.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon ${activity.type}">
          <i class="fas ${this.getActivityIcon(activity.type)}"></i>
        </div>
        <div class="activity-details">
          <p>${this.escapeHtml(activity.message)}</p>
          <span class="activity-time">
            ${this.formatTime(activity.timestamp)}
          </span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Load system alerts
   * @returns {Promise<void>}
   * @private
   */
  async loadAlerts() {
    try {
      const response = await fetch(DASHBOARD_CONFIG.API_ENDPOINTS.ALERTS);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      
      const alerts = await response.json();
      this.renderAlertsList(alerts);
    } catch (error) {
      this.handleError('Failed to load alerts', error);
    }
  }

  /**
   * Render alerts list
   * @param {Array} alerts - Alert data
   * @private
   */
  renderAlertsList(alerts) {
    this.elements.alertsList.innerHTML = alerts.map(alert => `
      <div class="alert-item ${alert.severity}">
        <div class="alert-icon">
          <i class="fas ${this.getAlertIcon(alert.severity)}"></i>
        </div>
        <div class="alert-details">
          <p>${this.escapeHtml(alert.message)}</p>
          <span class="alert-time">
            ${this.formatTime(alert.timestamp)}
          </span>
        </div>
      </div>
    `).join('');
  }

  /**
   * Handle real-time updates
   * @param {Object} data - Update data
   * @private
   */
  handleRealtimeUpdate(data) {
    switch (data.type) {
      case 'stats':
        this.updateStats(data.data);
        break;
      case 'sales':
        this.updateSalesChart(data.data);
        break;
      case 'popular_items':
        this.updatePopularItemsChart(data.data);
        break;
      case 'activity':
        this.addActivity(data.data);
        break;
      case 'alert':
        this.addAlert(data.data);
        break;
      default:
        console.warn('Unknown update type:', data.type);
    }
  }

  /**
   * Handle period change
   * @param {Event} event - Change event
   * @private
   */
  async handlePeriodChange(event) {
    const period = event.target.dataset.period;
    if (period === this.state.selectedPeriod) return;

    this.state.selectedPeriod = period;
    this.updateActiveButton(event.target, this.elements.periodButtons);

    try {
      const data = await this.fetchSalesData(period);
      this.updateSalesChart(data);
    } catch (error) {
      this.handleError('Failed to update sales data', error);
    }
  }

  /**
   * Handle category change
   * @param {Event} event - Change event
   * @private
   */
  async handleCategoryChange(event) {
    const category = event.target.value;
    if (category === this.state.selectedCategory) return;

    this.state.selectedCategory = category;

    try {
      const data = await this.fetchPopularItems(category);
      this.updatePopularItemsChart(data);
    } catch (error) {
      this.handleError('Failed to update popular items', error);
    }
  }

  /**
   * Handle search input
   * @param {string} query - Search query
   * @private
   */
  handleSearch(query) {
    // Implement search functionality
    console.debug('Search query:', query);
  }

  /**
   * Toggle notifications panel
   * @private
   */
  toggleNotifications() {
    // Implement notifications toggle
    console.debug('Toggling notifications');
  }

  /**
   * Show notification message
   * @param {string} message - Notification message
   * @param {string} type - Notification type
   * @private
   */
  showNotification(message, type = 'info') {
    // Implement notification display
    console.debug('Notification:', type, message);
  }

  /**
   * Handle error
   * @param {string} message - Error message
   * @param {Error} error - Error object
   * @private
   */
  handleError(message, error) {
    console.error(message, error);
    this.showNotification(message, 'error');
    this.state.error = error;
  }

  /**
   * Set loading state
   * @param {boolean} loading - Loading state
   * @private
   */
  setLoading(loading) {
    this.state.isLoading = loading;
    this.elements.loadingIndicator.classList.toggle(UI_CLASSES.LOADING, loading);
  }

  /**
   * Update active button state
   * @param {HTMLElement} activeButton - Active button
   * @param {NodeList} buttonGroup - Button group
   * @private
   */
  updateActiveButton(activeButton, buttonGroup) {
    buttonGroup.forEach(btn => 
      btn.classList.toggle(UI_CLASSES.ACTIVE, btn === activeButton)
    );
  }

  /**
   * Get icon for activity type
   * @param {string} type - Activity type
   * @returns {string} Icon class
   * @private
   */
  getActivityIcon(type) {
    const icons = {
      order: 'fa-shopping-cart',
      payment: 'fa-credit-card',
      customer: 'fa-user',
      inventory: 'fa-box',
      system: 'fa-cog'
    };
    return icons[type] || 'fa-info-circle';
  }

  /**
   * Get icon for alert severity
   * @param {string} severity - Alert severity
   * @returns {string} Icon class
   * @private
   */
  getAlertIcon(severity) {
    const icons = {
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      success: 'fa-check-circle',
      info: 'fa-info-circle'
    };
    return icons[severity] || 'fa-info-circle';
  }

  /**
   * Format timestamp
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted time
   * @private
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // Within last hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }

    // Within last day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // Otherwise show date
    return date.toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   * @private
   */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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
}

// Initialize dashboard
const dashboard = new AdminDashboard();
