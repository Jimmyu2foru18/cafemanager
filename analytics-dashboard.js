/**
 * Analytics Dashboard Component
 *
 * This class represents a modern and responsive dashboard for visualizing café analytics.
 * It integrates with the AnalyticsService to fetch and display various analytics data,
 * providing insights into sales, inventory, customer behavior, and performance metrics.
 *
 * Key Features:
 * - **Responsive Design**: Adapts to different screen sizes for optimal viewing on desktops, tablets, and mobile devices.
 * - **Data Visualization**: Utilizes Chart.js for rendering interactive charts and graphs.
 * - **Real-Time Updates**: Automatically refreshes analytics data at specified intervals to ensure up-to-date information.
 *
 * Configuration Options:
 * - `containerId`: The ID of the HTML element where the dashboard will be rendered (default: 'analytics-dashboard').
 * - `refreshInterval`: The interval in milliseconds for refreshing the analytics data (default: 300000 ms or 5 minutes).
 *
 * Usage:
 * To create an instance of the AnalyticsDashboard, provide optional configuration parameters:
 *
 * ```javascript
 * const dashboard = new AnalyticsDashboard({ containerId: 'my-custom-dashboard' });
 * ```
 */

import { AnalyticsService } from '../../services/analytics_service.js';
import Chart from 'chart.js/auto';

class AnalyticsDashboard {
    constructor(config = {}) {
        this.config = {
            containerId: 'analytics-dashboard',
            refreshInterval: 300000, // 5 minutes
            ...config
        };
        
        this.analyticsService = new AnalyticsService();
        this.charts = new Map();
        this.init();
    }

    /**
     * Initialize dashboard
     */
    async init() {
        this.container = document.getElementById(this.config.containerId);
        if (!this.container) {
            throw new Error(`Container ${this.config.containerId} not found`);
        }

        this.createDashboardLayout();
        await this.loadData();
        this.setupRefreshTimer();
    }

    /**
     * Create dashboard layout
     */
    createDashboardLayout() {
        this.container.innerHTML = `
            <div class="dashboard-grid">
                <div class="card revenue-card">
                    <h3>Revenue Overview</h3>
                    <div class="chart-container">
                        <canvas id="revenue-chart"></canvas>
                    </div>
                </div>
                
                <div class="card orders-card">
                    <h3>Order Trends</h3>
                    <div class="chart-container">
                        <canvas id="orders-chart"></canvas>
                    </div>
                </div>
                
                <div class="card inventory-card">
                    <h3>Inventory Status</h3>
                    <div class="chart-container">
                        <canvas id="inventory-chart"></canvas>
                    </div>
                </div>
                
                <div class="card customers-card">
                    <h3>Customer Insights</h3>
                    <div class="chart-container">
                        <canvas id="customers-chart"></canvas>
                    </div>
                </div>
                
                <div class="card performance-card">
                    <h3>Staff Performance</h3>
                    <div class="chart-container">
                        <canvas id="performance-chart"></canvas>
                    </div>
                </div>
                
                <div class="card forecast-card">
                    <h3>Sales Forecast</h3>
                    <div class="chart-container">
                        <canvas id="forecast-chart"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Add dashboard styles
        const style = document.createElement('style');
        style.textContent = `
            .dashboard-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: 1.5rem;
                padding: 1.5rem;
            }
            
            .card {
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                padding: 1.5rem;
                transition: transform 0.2s;
            }
            
            .card:hover {
                transform: translateY(-5px);
            }
            
            .chart-container {
                position: relative;
                height: 300px;
                width: 100%;
            }
            
            h3 {
                margin: 0 0 1rem;
                color: #333;
                font-size: 1.2rem;
            }
            
            @media (max-width: 768px) {
                .dashboard-grid {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Load dashboard data
     */
    async loadData() {
        try {
            const [sales, inventory, customers, performance] = await Promise.all([
                this.analyticsService.getSalesAnalytics(),
                this.analyticsService.getInventoryAnalytics(),
                this.analyticsService.getCustomerAnalytics(),
                this.analyticsService.getPerformanceMetrics()
            ]);

            this.updateRevenueChart(sales);
            this.updateOrdersChart(sales);
            this.updateInventoryChart(inventory);
            this.updateCustomersChart(customers);
            this.updatePerformanceChart(performance);
            this.updateForecastChart(sales);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    /**
     * Update revenue chart
     */
    updateRevenueChart(data) {
        const ctx = document.getElementById('revenue-chart').getContext('2d');
        
        if (this.charts.has('revenue')) {
            this.charts.get('revenue').destroy();
        }

        this.charts.set('revenue', new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dailyTrends.map(item => item.date),
                datasets: [{
                    label: 'Daily Revenue',
                    data: data.dailyTrends.map(item => item.total),
                    borderColor: '#4CAF50',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        }));
    }

    /**
     * Update orders chart
     */
    updateOrdersChart(data) {
        const ctx = document.getElementById('orders-chart').getContext('2d');
        
        if (this.charts.has('orders')) {
            this.charts.get('orders').destroy();
        }

        this.charts.set('orders', new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.hourlyTrends.map((_, index) => `${index}:00`),
                datasets: [{
                    label: 'Orders by Hour',
                    data: data.hourlyTrends,
                    backgroundColor: '#2196F3'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }));
    }

    /**
     * Update inventory chart
     */
    updateInventoryChart(data) {
        const ctx = document.getElementById('inventory-chart').getContext('2d');
        
        if (this.charts.has('inventory')) {
            this.charts.get('inventory').destroy();
        }

        const lowStockItems = data.lowStockItems.slice(0, 10);

        this.charts.set('inventory', new Chart(ctx, {
            type: 'horizontalBar',
            data: {
                labels: lowStockItems.map(item => item.name),
                datasets: [{
                    label: 'Current Stock',
                    data: lowStockItems.map(item => item.quantity),
                    backgroundColor: lowStockItems.map(item => 
                        item.quantity <= item.threshold ? '#F44336' : '#FF9800'
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y'
            }
        }));
    }

    /**
     * Update customers chart
     */
    updateCustomersChart(data) {
        const ctx = document.getElementById('customers-chart').getContext('2d');
        
        if (this.charts.has('customers')) {
            this.charts.get('customers').destroy();
        }

        this.charts.set('customers', new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['New', 'Regular', 'Frequent', 'Inactive'],
                datasets: [{
                    data: [
                        data.segments.new,
                        data.segments.regular,
                        data.segments.frequent,
                        data.segments.inactive
                    ],
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#9C27B0',
                        '#757575'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }));
    }

    /**
     * Update performance chart
     */
    updatePerformanceChart(data) {
        const ctx = document.getElementById('performance-chart').getContext('2d');
        
        if (this.charts.has('performance')) {
            this.charts.get('performance').destroy();
        }

        const staffData = Object.entries(data.staffPerformance)
            .map(([id, stats]) => ({
                id,
                ordersPerHour: stats.orders / (stats.totalTime / 3600),
                revenue: stats.revenue
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        this.charts.set('performance', new Chart(ctx, {
            type: 'radar',
            data: {
                labels: staffData.map(staff => `Staff ${staff.id}`),
                datasets: [{
                    label: 'Orders/Hour',
                    data: staffData.map(staff => staff.ordersPerHour),
                    borderColor: '#2196F3',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }));
    }

    /**
     * Update forecast chart
     */
    updateForecastChart(data) {
        const ctx = document.getElementById('forecast-chart').getContext('2d');
        
        if (this.charts.has('forecast')) {
            this.charts.get('forecast').destroy();
        }

        const forecast = data.forecast || [];

        this.charts.set('forecast', new Chart(ctx, {
            type: 'line',
            data: {
                labels: forecast.map(item => item.date),
                datasets: [{
                    label: 'Actual',
                    data: data.dailyTrends.map(item => item.total),
                    borderColor: '#2196F3',
                    tension: 0.4
                }, {
                    label: 'Forecast',
                    data: forecast.map(item => item.value),
                    borderColor: '#FF9800',
                    borderDash: [5, 5],
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }));
    }

    /**
     * Set up refresh timer
     */
    setupRefreshTimer() {
        setInterval(() => this.loadData(), this.config.refreshInterval);
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        const style = document.createElement('style');
        style.textContent = `
            .error-message {
                background: #ffebee;
                color: #c62828;
                padding: 1rem;
                margin: 1rem;
                border-radius: 4px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
        
        this.container.prepend(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

export default AnalyticsDashboard;
