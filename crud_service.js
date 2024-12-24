/**
 * CRUD Service
 *
 * This class serves as a base service for handling Create, Read, Update, and Delete (CRUD)
 * operations with the API. It provides standardized methods for API communication, error
 * handling, and request management, making it easier to interact with the backend services
 * of the CaféManager application.
 *
 * Key Features:
 * - **Standardized API Communication**: Provides a consistent interface for making API requests
 *   across different entities.
 * - **Error Handling with Retries**: Implements automatic retries for failed requests, improving
 *   reliability in unstable network conditions.
 * - **Request Caching**: Caches responses to reduce redundant API calls and improve performance.
 * - **Rate Limiting**: Manages the frequency of API requests to prevent exceeding server limits.
 *
 * Usage:
 * To use this service, instantiate it with the base API URL and optional configuration options:
 *
 * ```javascript
 * const apiService = new CRUDService('https://your-domain.com/api/v1');
 * ```
 *
 * This service can be extended to create specific services for different entities, such as
 * users, products, or orders, by adding entity-specific methods.
 */
class CRUDService {
    /**
     * Initialize the CRUD service
     * @param {string} baseUrl - Base API URL
     * @param {Object} options - Configuration options
     */
    constructor(baseUrl, options = {}) {
        this.baseUrl = baseUrl;
        this.options = {
            maxRetries: 3,
            retryDelay: 1000,
            cacheTimeout: 5 * 60 * 1000, // 5 minutes
            ...options
        };

        // Initialize cache
        this.cache = new Map();
        
        // Request queue for rate limiting
        this.requestQueue = [];
        this.isProcessingQueue = false;
    }

    /**
     * Make an API request with retries and error handling
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise} API response
     * @private
     */
    async makeRequest(url, options) {
        let lastError;
        
        for (let attempt = 0; attempt < this.options.maxRetries; attempt++) {
            try {
                // Add request to queue
                const response = await this.queueRequest(url, options);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                // Cache successful GET requests
                if (options.method === 'GET') {
                    this.cacheResponse(url, data);
                } else {
                    // Invalidate cache for non-GET requests
                    this.invalidateCache(url);
                }
                
                return data;
            } catch (error) {
                lastError = error;
                console.error(`Request attempt ${attempt + 1} failed:`, error);
                
                if (attempt < this.options.maxRetries - 1) {
                    await this.delay(this.getRetryDelay(attempt));
                }
            }
        }

        throw new Error(`Request failed after ${this.options.maxRetries} attempts: ${lastError.message}`);
    }

    /**
     * Queue a request for rate limiting
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {Promise} Fetch response
     * @private
     */
    async queueRequest(url, options) {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({ url, options, resolve, reject });
            
            if (!this.isProcessingQueue) {
                this.processQueue();
            }
        });
    }

    /**
     * Process the request queue
     * @private
     */
    async processQueue() {
        if (this.requestQueue.length === 0) {
            this.isProcessingQueue = false;
            return;
        }

        this.isProcessingQueue = true;
        const { url, options, resolve, reject } = this.requestQueue.shift();

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            resolve(response);
        } catch (error) {
            reject(error);
        }

        // Add delay between requests
        await this.delay(100);
        this.processQueue();
    }

    /**
     * Cache a response
     * @param {string} url - Request URL
     * @param {Object} data - Response data
     * @private
     */
    cacheResponse(url, data) {
        this.cache.set(url, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached response if valid
     * @param {string} url - Request URL
     * @returns {Object|null} Cached data or null
     * @private
     */
    getCachedResponse(url) {
        const cached = this.cache.get(url);
        
        if (cached && Date.now() - cached.timestamp < this.options.cacheTimeout) {
            return cached.data;
        }
        
        return null;
    }

    /**
     * Invalidate cache for a URL
     * @param {string} url - URL to invalidate
     * @private
     */
    invalidateCache(url) {
        this.cache.delete(url);
    }

    /**
     * Calculate retry delay with exponential backoff
     * @param {number} attempt - Current attempt number
     * @returns {number} Delay in milliseconds
     * @private
     */
    getRetryDelay(attempt) {
        return Math.min(
            this.options.retryDelay * Math.pow(2, attempt),
            30000 // Max 30 seconds
        );
    }

    /**
     * Create a delay promise
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Delay promise
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create a new resource
     * @param {Object} data - Resource data
     * @returns {Promise} Created resource
     * @public
     */
    async create(data) {
        return this.makeRequest(`${this.baseUrl}`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Read a resource
     * @param {string|number} id - Resource ID
     * @returns {Promise} Resource data
     * @public
     */
    async read(id) {
        const url = `${this.baseUrl}/${id}`;
        
        // Check cache first
        const cached = this.getCachedResponse(url);
        if (cached) return cached;
        
        return this.makeRequest(url, {
            method: 'GET'
        });
    }

    /**
     * Update a resource
     * @param {string|number} id - Resource ID
     * @param {Object} data - Update data
     * @returns {Promise} Updated resource
     * @public
     */
    async update(id, data) {
        return this.makeRequest(`${this.baseUrl}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    /**
     * Delete a resource
     * @param {string|number} id - Resource ID
     * @returns {Promise} Deletion result
     * @public
     */
    async delete(id) {
        return this.makeRequest(`${this.baseUrl}/${id}`, {
            method: 'DELETE'
        });
    }

    /**
     * List resources with optional filters
     * @param {Object} filters - Optional filters
     * @returns {Promise} List of resources
     * @public
     */
    async list(filters = {}) {
        const queryString = new URLSearchParams(filters).toString();
        const url = `${this.baseUrl}${queryString ? `?${queryString}` : ''}`;
        
        // Check cache first
        const cached = this.getCachedResponse(url);
        if (cached) return cached;
        
        return this.makeRequest(url, {
            method: 'GET'
        });
    }

    /**
     * Clear the entire cache
     * @public
     */
    clearCache() {
        this.cache.clear();
    }
}

export default CRUDService;
