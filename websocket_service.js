/**
 * WebSocketService Class
 *
 * This class manages real-time communication between the client and server using
 * WebSocket technology. It provides robust features for maintaining a stable
 * connection and handling message exchanges efficiently.
 *
 * Key Features:
 * - **Automatic Reconnection**: Implements an exponential backoff strategy for
 *   reconnecting to the WebSocket server in case of connection loss.
 * - **Authentication Handling**: Manages user authentication to ensure secure
 *   communication.
 * - **Channel Subscription Management**: Allows clients to subscribe to specific
 *   channels for targeted message delivery.
 * - **Message Queuing**: Queues messages during disconnections to ensure that no
 *   data is lost and all messages are delivered once the connection is reestablished.
 *
 * Usage:
 * To use this service, instantiate it with the WebSocket server URL and utilize
 * the provided methods to connect, send messages, and manage subscriptions:
 *
 * ```javascript
 * const wsService = new WebSocketService('ws://localhost:8080');
 * wsService.connect();
 * ```
 *
 * Note: Ensure that the WebSocket server is running and accessible before using
 * this service.
 */
class WebSocketService {
    /**
     * Initialize the WebSocket service
     * @param {string} url - The WebSocket server URL
     */
    constructor(url) {
        this.url = url;
        this.socket = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000; // Start with 1 second
        this.handlers = new Map();
        this.subscriptions = new Set();
        this.messageQueue = [];
        this.debug = false; // Enable for development
    }

    /**
     * Enable or disable debug logging
     * @param {boolean} enabled - Whether to enable debug logging
     */
    setDebug(enabled) {
        this.debug = enabled;
    }

    /**
     * Log debug messages if debug mode is enabled
     * @param {string} message - Message to log
     * @param {*} [data] - Optional data to log
     * @private
     */
    log(message, data = null) {
        if (this.debug) {
            console.log(`[WebSocket] ${message}`, data || '');
        }
    }

    /**
     * Connect to the WebSocket server with authentication
     * @param {string} token - JWT authentication token
     * @returns {Promise} Resolves when connected, rejects on error
     */
    connect(token) {
        return new Promise((resolve, reject) => {
            try {
                this.log('Connecting to WebSocket server...');
                this.socket = new WebSocket(this.url);
                
                this.socket.onopen = () => {
                    this.log('Connected successfully');
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.reconnectDelay = 1000;
                    
                    // Authenticate with server
                    this.send({
                        type: 'auth',
                        token: token
                    });
                    
                    // Restore subscriptions
                    this.resubscribeToChannels();
                    
                    // Process queued messages
                    this.processMessageQueue();
                    
                    resolve();
                };

                this.socket.onclose = (event) => {
                    this.log('Connection closed', event);
                    this.isConnected = false;
                    this.handleReconnect();
                };

                this.socket.onerror = (error) => {
                    this.log('Connection error', error);
                    reject(error);
                };

                this.socket.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        this.handleMessage(data);
                    } catch (error) {
                        this.log('Error parsing message', error);
                    }
                };
            } catch (error) {
                this.log('Connection failed', error);
                reject(error);
            }
        });
    }

    /**
     * Handle reconnection attempts with exponential backoff
     * @private
     */
    handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.log('Max reconnection attempts reached');
            return;
        }

        setTimeout(() => {
            this.log(`Attempting to reconnect (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            this.reconnectAttempts++;
            this.reconnectDelay *= 2; // Exponential backoff
            this.connect();
        }, this.reconnectDelay);
    }

    /**
     * Resubscribe to all previously subscribed channels
     * @private
     */
    resubscribeToChannels() {
        this.subscriptions.forEach(channel => {
            this.log(`Resubscribing to channel: ${channel}`);
            this.subscribe(channel);
        });
    }

    /**
     * Process messages queued during disconnection
     * @private
     */
    processMessageQueue() {
        this.log(`Processing ${this.messageQueue.length} queued messages`);
        while (this.messageQueue.length > 0) {
            const msg = this.messageQueue.shift();
            this.send(msg);
        }
    }

    /**
     * Subscribe to a channel
     * @param {string} channel - Channel name to subscribe to
     */
    subscribe(channel) {
        if (!channel) {
            throw new Error('Channel name is required');
        }

        if (!this.isConnected) {
            this.subscriptions.add(channel);
            this.log(`Queued subscription to channel: ${channel}`);
            return;
        }

        this.send({
            type: 'subscribe',
            channel: channel
        });
        this.subscriptions.add(channel);
        this.log(`Subscribed to channel: ${channel}`);
    }

    /**
     * Unsubscribe from a channel
     * @param {string} channel - Channel name to unsubscribe from
     */
    unsubscribe(channel) {
        if (!channel) {
            throw new Error('Channel name is required');
        }

        if (!this.isConnected) {
            this.subscriptions.delete(channel);
            this.log(`Removed subscription to channel: ${channel}`);
            return;
        }

        this.send({
            type: 'unsubscribe',
            channel: channel
        });
        this.subscriptions.delete(channel);
        this.log(`Unsubscribed from channel: ${channel}`);
    }

    /**
     * Send a message to the server
     * @param {Object} data - Message data to send
     */
    send(data) {
        if (!data) {
            throw new Error('Message data is required');
        }

        if (!this.isConnected) {
            this.messageQueue.push(data);
            this.log('Message queued for later sending', data);
            return;
        }

        try {
            this.socket.send(JSON.stringify(data));
            this.log('Message sent', data);
        } catch (error) {
            this.log('Error sending message', error);
            this.messageQueue.push(data);
        }
    }

    /**
     * Register an event handler
     * @param {string} event - Event name to handle
     * @param {Function} handler - Handler function
     */
    on(event, handler) {
        if (!event || typeof handler !== 'function') {
            throw new Error('Event name and handler function are required');
        }

        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
        this.log(`Registered handler for event: ${event}`);
    }

    /**
     * Remove an event handler
     * @param {string} event - Event name
     * @param {Function} handler - Handler function to remove
     */
    off(event, handler) {
        if (!event || typeof handler !== 'function') {
            throw new Error('Event name and handler function are required');
        }

        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
            this.log(`Removed handler for event: ${event}`);
        }
    }

    /**
     * Handle incoming messages from the server
     * @param {Object} data - Message data
     * @private
     */
    handleMessage(data) {
        this.log('Received message', data);

        switch (data.type) {
            case 'auth':
                this.handleAuthResponse(data);
                break;

            case 'subscribe':
                this.handleSubscribeResponse(data);
                break;

            case 'message':
            case 'broadcast':
                this.handleChannelMessage(data);
                break;

            case 'error':
                this.handleErrorMessage(data);
                break;

            default:
                this.log('Unknown message type', data);
        }
    }

    /**
     * Handle authentication response
     * @param {Object} data - Authentication response data
     * @private
     */
    handleAuthResponse(data) {
        if (data.status === 'success') {
            this.log('Authentication successful');
            this.emit('auth_success', data);
        } else {
            this.log('Authentication failed', data.message);
            this.emit('auth_error', data);
        }
    }

    /**
     * Handle subscription response
     * @param {Object} data - Subscription response data
     * @private
     */
    handleSubscribeResponse(data) {
        if (data.status === 'success') {
            this.log(`Successfully subscribed to channel: ${data.channel}`);
            this.emit('subscribe_success', data);
        } else {
            this.log(`Failed to subscribe to channel: ${data.channel}`, data.message);
            this.emit('subscribe_error', data);
        }
    }

    /**
     * Handle channel message
     * @param {Object} data - Channel message data
     * @private
     */
    handleChannelMessage(data) {
        const handlers = this.handlers.get(data.channel);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data.message);
                } catch (error) {
                    this.log('Error in message handler', error);
                }
            });
        }
    }

    /**
     * Handle error message from server
     * @param {Object} data - Error message data
     * @private
     */
    handleErrorMessage(data) {
        this.log('Server error', data.message);
        this.emit('error', data);
    }

    /**
     * Emit an event to all registered handlers
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @private
     */
    emit(event, data) {
        const handlers = this.handlers.get(event);
        if (handlers) {
            handlers.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    this.log('Error in event handler', error);
                }
            });
        }
    }

    /**
     * Disconnect from the WebSocket server
     */
    disconnect() {
        if (this.socket) {
            this.log('Disconnecting from server');
            this.socket.close();
            this.isConnected = false;
            this.socket = null;
        }
    }
}

// Export the WebSocketService class
export default WebSocketService;
