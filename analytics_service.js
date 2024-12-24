/**
 * Analytics Service
 *
 * The AnalyticsService class is responsible for handling data processing and analytics
 * for the dashboard. It provides functionalities for aggregating data, analyzing trends,
 * and monitoring performance metrics in real-time. This service is designed to efficiently
 * handle large datasets and provide insights to enhance decision-making.
 *
 * Key Features:
 * - **Data Aggregation**: Combines data from various sources for comprehensive analysis.
 * - **Trend Analysis**: Identifies patterns and trends in the data over time.
 * - **Performance Metrics**: Tracks key performance indicators (KPIs) to evaluate success.
 * - **Real-Time Monitoring**: Provides up-to-date analytics for immediate insights.
 * - **Large Dataset Handling**: Optimized for processing and analyzing large volumes of data.
 *
 * Configuration Options:
 * - `batchSize`: Number of records to process in each batch (default: 1000).
 * - `cacheTimeout`: Duration (in milliseconds) for which cached data is valid (default: 5 minutes).
 *
 * Usage:
 * To use this service, instantiate it with the desired configuration options:
 * 
 * ```javascript
 * const analyticsService = new AnalyticsService({ batchSize: 500 });
 * ```
 */

class AnalyticsService {
    constructor(config) {
        this.config = {
            batchSize: 1000,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            ...config
        };
        
        this.cache = new Map();
        this.dataWorker = new Worker('analytics_worker.js');
        this.setupWorker();
    }

    /**
     * Initialize worker event handlers
     * @private
     */
    setupWorker() {
        this.dataWorker.onmessage = (event) => {
            const { type, data, error } = event.data;
            if (error) {
                console.error('Worker error:', error);
                return;
            }
            
            // Cache the processed data
            if (data.cacheKey) {
                this.cache.set(data.cacheKey, {
                    data: data.result,
                    timestamp: Date.now()
                });
            }
        };
    }

    /**
     * Get sales analytics with trends
     * @param {Object} params Query parameters
     * @returns {Promise<Object>} Sales analytics data
     */
    async getSalesAnalytics(params) {
        const cacheKey = `sales_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.fetchDataInBatches('/api/sales', params);
        return this.processDataWithWorker('sales', data, cacheKey);
    }

    /**
     * Get inventory analytics
     * @param {Object} params Query parameters
     * @returns {Promise<Object>} Inventory analytics data
     */
    async getInventoryAnalytics(params) {
        const cacheKey = `inventory_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.fetchDataInBatches('/api/inventory', params);
        return this.processDataWithWorker('inventory', data, cacheKey);
    }

    /**
     * Get customer analytics
     * @param {Object} params Query parameters
     * @returns {Promise<Object>} Customer analytics data
     */
    async getCustomerAnalytics(params) {
        const cacheKey = `customers_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.fetchDataInBatches('/api/customers', params);
        return this.processDataWithWorker('customers', data, cacheKey);
    }

    /**
     * Get performance metrics
     * @param {Object} params Query parameters
     * @returns {Promise<Object>} Performance metrics data
     */
    async getPerformanceMetrics(params) {
        const cacheKey = `performance_${JSON.stringify(params)}`;
        const cached = this.getFromCache(cacheKey);
        if (cached) return cached;

        const data = await this.fetchDataInBatches('/api/performance', params);
        return this.processDataWithWorker('performance', data, cacheKey);
    }

    /**
     * Fetch data in batches to handle large datasets
     * @param {string} endpoint API endpoint
     * @param {Object} params Query parameters
     * @returns {Promise<Array>} Combined data
     * @private
     */
    async fetchDataInBatches(endpoint, params) {
        const allData = [];
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            const response = await fetch(`${endpoint}?${new URLSearchParams({
                ...params,
                page,
                limit: this.config.batchSize
            })}`);

            const { data, pagination } = await response.json();
            allData.push(...data);

            hasMore = pagination.hasMore;
            page++;

            // Optional: Add delay between batches to prevent overwhelming the server
            if (hasMore) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return allData;
    }

    /**
     * Process data using web worker
     * @param {string} type Analysis type
     * @param {Array} data Raw data
     * @param {string} cacheKey Cache key
     * @returns {Promise} Processed data
     * @private
     */
    processDataWithWorker(type, data, cacheKey) {
        return new Promise((resolve, reject) => {
            const messageId = Date.now().toString();
            
            const handler = (event) => {
                const { id, result, error } = event.data;
                if (id !== messageId) return;
                
                this.dataWorker.removeEventListener('message', handler);
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            };
            
            this.dataWorker.addEventListener('message', handler);
            this.dataWorker.postMessage({
                type,
                data,
                cacheKey,
                id: messageId
            });
        });
    }

    /**
     * Get data from cache if valid
     * @param {string} key Cache key
     * @returns {Object|null} Cached data or null
     * @private
     */
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
            return cached.data;
        }
        return null;
    }

    /**
     * Generate trend analysis
     * @param {Array} data Time series data
     * @returns {Object} Trend analysis
     */
    generateTrends(data) {
        return this.processDataWithWorker('trends', data);
    }

    /**
     * Generate forecasts using historical data
     * @param {Array} data Historical data
     * @param {Object} options Forecast options
     * @returns {Object} Forecast data
     */
    generateForecasts(data, options) {
        return this.processDataWithWorker('forecast', { data, options });
    }

    /**
     * Clear analytics cache
     */
    clearCache() {
        this.cache.clear();
    }
}

export default AnalyticsService;
