/**
 * Analytics Worker
 *
 * This web worker is designed to handle heavy data processing tasks in a separate thread,
 * allowing for efficient and non-blocking analytics operations for the dashboard. By offloading
 * intensive computations to a worker, the main thread remains responsive, enhancing user experience.
 *
 * Key Responsibilities:
 * - Processes various types of data, including sales, inventory, customer, and performance metrics.
 * - Handles incoming messages from the main thread, performing the appropriate data processing based
 *   on the message type.
 * - Utilizes specialized functions for processing and analyzing different data sets.
 *
 * Supported Data Types:
 * - **Sales Data**: Processes raw sales data to generate sales analytics.
 * - **Inventory Data**: Analyzes inventory data for stock management insights.
 * - **Customer Data**: Provides insights into customer behavior and demographics.
 * - **Performance Data**: Evaluates performance metrics for overall business health.
 *
 * Usage:
 * This worker listens for messages from the main application. Each message should contain:
 * - `type`: The type of data to process (e.g., 'sales', 'inventory', 'customers', 'performance').
 * - `data`: The raw data to be processed.
 * - `cacheKey`: An optional key for caching results.
 * - `id`: A unique identifier for the message.
 * Example:
 * ```javascript
 * const worker = new Worker('analytics_worker.js');
 * worker.postMessage({ type: 'sales', data: salesData });
 * ```
 */

self.onmessage = function(e) {
    const { type, data, cacheKey, id } = e.data;
    
    try {
        let result;
        switch (type) {
            case 'sales':
                result = processSalesData(data);
                break;
            case 'inventory':
                result = processInventoryData(data);
                break;
            case 'customers':
                result = processCustomerData(data);
                break;
            case 'performance':
                result = processPerformanceData(data);
                break;
            case 'trends':
                result = analyzeTrends(data);
                break;
            case 'forecast':
                result = generateForecast(data);
                break;
            default:
                throw new Error(`Unknown analysis type: ${type}`);
        }
        
        self.postMessage({ id, result, cacheKey });
    } catch (error) {
        self.postMessage({ id, error: error.message });
    }
};

/**
 * Process sales data
 * @param {Array} data Raw sales data
 * @returns {Object} Processed sales analytics
 */
function processSalesData(data) {
    const hourlyData = new Array(24).fill(0);
    const dailyData = {};
    const itemSales = {};
    let totalRevenue = 0;
    
    data.forEach(sale => {
        // Hourly analysis
        const hour = new Date(sale.timestamp).getHours();
        hourlyData[hour] += sale.total;
        
        // Daily analysis
        const date = sale.timestamp.split('T')[0];
        dailyData[date] = (dailyData[date] || 0) + sale.total;
        
        // Item analysis
        sale.items.forEach(item => {
            if (!itemSales[item.id]) {
                itemSales[item.id] = {
                    name: item.name,
                    quantity: 0,
                    revenue: 0
                };
            }
            itemSales[item.id].quantity += item.quantity;
            itemSales[item.id].revenue += item.price * item.quantity;
        });
        
        totalRevenue += sale.total;
    });
    
    return {
        hourlyTrends: hourlyData,
        dailyTrends: Object.entries(dailyData).map(([date, total]) => ({
            date,
            total
        })),
        topItems: Object.values(itemSales)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10),
        totalRevenue,
        averageOrderValue: totalRevenue / data.length
    };
}

/**
 * Process inventory data
 * @param {Array} data Raw inventory data
 * @returns {Object} Processed inventory analytics
 */
function processInventoryData(data) {
    const stockLevels = {};
    const lowStockItems = [];
    const turnoverRates = {};
    
    data.forEach(item => {
        stockLevels[item.id] = {
            name: item.name,
            current: item.quantity,
            optimal: item.optimal_quantity
        };
        
        if (item.quantity <= item.alert_threshold) {
            lowStockItems.push({
                id: item.id,
                name: item.name,
                quantity: item.quantity,
                threshold: item.alert_threshold
            });
        }
        
        // Calculate turnover rate
        if (item.history && item.history.length > 0) {
            const totalSold = item.history.reduce((sum, h) => sum + h.quantity, 0);
            turnoverRates[item.id] = {
                name: item.name,
                rate: totalSold / item.average_quantity
            };
        }
    });
    
    return {
        stockLevels,
        lowStockItems,
        turnoverRates: Object.values(turnoverRates)
            .sort((a, b) => b.rate - a.rate)
    };
}

/**
 * Process customer data
 * @param {Array} data Raw customer data
 * @returns {Object} Processed customer analytics
 */
function processCustomerData(data) {
    const customerSegments = {
        new: 0,
        regular: 0,
        frequent: 0,
        inactive: 0
    };
    
    const orderFrequency = {};
    let totalLifetimeValue = 0;
    
    data.forEach(customer => {
        // Segment customers
        const orderCount = customer.orders.length;
        if (orderCount === 0) {
            customerSegments.inactive++;
        } else if (orderCount <= 2) {
            customerSegments.new++;
        } else if (orderCount <= 10) {
            customerSegments.regular++;
        } else {
            customerSegments.frequent++;
        }
        
        // Calculate order frequency
        if (orderCount > 0) {
            const firstOrder = new Date(customer.orders[0].date);
            const lastOrder = new Date(customer.orders[orderCount - 1].date);
            const daysBetween = (lastOrder - firstOrder) / (1000 * 60 * 60 * 24);
            const frequency = orderCount / (daysBetween || 1);
            orderFrequency[customer.id] = frequency;
        }
        
        // Calculate lifetime value
        totalLifetimeValue += customer.orders.reduce((sum, order) => sum + order.total, 0);
    });
    
    return {
        segments: customerSegments,
        averageLifetimeValue: totalLifetimeValue / data.length,
        topCustomers: Object.entries(orderFrequency)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 20)
            .map(([id]) => data.find(c => c.id === id))
    };
}

/**
 * Process performance data
 * @param {Array} data Raw performance data
 * @returns {Object} Processed performance metrics
 */
function processPerformanceData(data) {
    const metrics = {
        orderFulfillment: {
            total: 0,
            onTime: 0,
            delayed: 0
        },
        revenue: {
            daily: {},
            weekly: {},
            monthly: {}
        },
        staffPerformance: {}
    };
    
    data.forEach(record => {
        // Order fulfillment
        metrics.orderFulfillment.total++;
        if (record.status === 'delayed') {
            metrics.orderFulfillment.delayed++;
        } else {
            metrics.orderFulfillment.onTime++;
        }
        
        // Revenue tracking
        const date = new Date(record.timestamp);
        const day = date.toISOString().split('T')[0];
        const week = getWeekNumber(date);
        const month = date.toISOString().slice(0, 7);
        
        metrics.revenue.daily[day] = (metrics.revenue.daily[day] || 0) + record.total;
        metrics.revenue.weekly[week] = (metrics.revenue.weekly[week] || 0) + record.total;
        metrics.revenue.monthly[month] = (metrics.revenue.monthly[month] || 0) + record.total;
        
        // Staff performance
        if (record.staff_id) {
            if (!metrics.staffPerformance[record.staff_id]) {
                metrics.staffPerformance[record.staff_id] = {
                    orders: 0,
                    revenue: 0,
                    avgOrderTime: 0,
                    totalTime: 0
                };
            }
            const perf = metrics.staffPerformance[record.staff_id];
            perf.orders++;
            perf.revenue += record.total;
            perf.totalTime += record.preparation_time || 0;
            perf.avgOrderTime = perf.totalTime / perf.orders;
        }
    });
    
    return metrics;
}

/**
 * Analyze trends in time series data
 * @param {Array} data Time series data
 * @returns {Object} Trend analysis
 */
function analyzeTrends(data) {
    const trends = {
        overall: calculateTrend(data),
        seasonal: detectSeasonality(data),
        anomalies: detectAnomalies(data)
    };
    
    return trends;
}

/**
 * Generate forecast using historical data
 * @param {Object} params Forecast parameters
 * @returns {Object} Forecast data
 */
function generateForecast({ data, options }) {
    // Simple moving average forecast
    const period = options.period || 7;
    const forecast = [];
    
    for (let i = period; i < data.length; i++) {
        const sum = data.slice(i - period, i).reduce((a, b) => a + b.value, 0);
        forecast.push({
            date: data[i].date,
            value: sum / period
        });
    }
    
    return {
        forecast,
        confidence: calculateConfidence(data, forecast)
    };
}

/**
 * Helper function to get week number
 * @param {Date} date Date object
 * @returns {string} Week number
 */
function getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Calculate trend line
 * @param {Array} data Time series data
 * @returns {Object} Trend parameters
 */
function calculateTrend(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    
    data.forEach((point, i) => {
        sumX += i;
        sumY += point.value;
        sumXY += i * point.value;
        sumXX += i * i;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
}

/**
 * Detect seasonality in data
 * @param {Array} data Time series data
 * @returns {Object} Seasonality information
 */
function detectSeasonality(data) {
    // Implementation of seasonality detection
    // This could use techniques like autocorrelation or Fourier analysis
    return {
        hasSeasonal: false,
        period: 0
    };
}

/**
 * Detect anomalies in data
 * @param {Array} data Time series data
 * @returns {Array} Detected anomalies
 */
function detectAnomalies(data) {
    const mean = data.reduce((sum, point) => sum + point.value, 0) / data.length;
    const stdDev = Math.sqrt(
        data.reduce((sum, point) => sum + Math.pow(point.value - mean, 2), 0) / data.length
    );
    
    return data.filter(point => 
        Math.abs(point.value - mean) > 2 * stdDev
    );
}

/**
 * Calculate forecast confidence
 * @param {Array} actual Actual data
 * @param {Array} forecast Forecast data
 * @returns {number} Confidence score
 */
function calculateConfidence(actual, forecast) {
    const errors = [];
    for (let i = 0; i < Math.min(actual.length, forecast.length); i++) {
        errors.push(Math.abs(actual[i].value - forecast[i].value) / actual[i].value);
    }
    
    const mape = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    return 1 - mape;
}
