/**
 * Payment Gateway Service
 *
 * This class manages payment processing for the CaféManager application, supporting
 * multiple payment providers such as Stripe, Square, and PayPal. It provides a unified
 * interface for handling transactions, ensuring that payments can be processed securely
 * and efficiently.
 *
 * Key Features:
 * - **Multi-Provider Support**: Allows integration with various payment providers, enabling
 *   flexibility in payment processing options.
 * - **Configuration Management**: Supports configuration through environment variables and
 *   allows customization of the payment provider.
 * - **Payment Processing Methods**: Implements methods for processing payments through
 *   each supported provider, handling the specifics of each API.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate method for processing payments:
 *
 * ```javascript
 * const paymentGateway = new PaymentGateway();
 * paymentGateway.processPayment(orderData);
 * ```
 *
 * Ensure that the necessary API keys and environment settings are configured before
 * using this service.
 */

class PaymentGateway {
    constructor(config = {}) {
        this.config = {
            provider: 'stripe', // Default payment provider
            apiKey: process.env.PAYMENT_API_KEY,
            environment: process.env.NODE_ENV || 'development',
            ...config
        };
        
        this.providers = {
            stripe: this.stripePayment.bind(this),
            square: this.squarePayment.bind(this),
            paypal: this.paypalPayment.bind(this)
        };
    }

    /**
     * Process payment
     * @param {Object} paymentData Payment details
     * @returns {Promise<Object>} Payment result
     */
    async processPayment(paymentData) {
        try {
            this.validatePaymentData(paymentData);
            
            const provider = this.providers[paymentData.provider || this.config.provider];
            if (!provider) {
                throw new Error(`Payment provider ${paymentData.provider} not supported`);
            }
            
            const result = await provider(paymentData);
            await this.saveTransaction(result);
            
            return result;
        } catch (error) {
            console.error('Payment processing error:', error);
            throw new Error(`Payment failed: ${error.message}`);
        }
    }

    /**
     * Validate payment data
     * @param {Object} data Payment data
     * @throws {Error} Validation error
     * @private
     */
    validatePaymentData(data) {
        const requiredFields = ['amount', 'currency', 'payment_method'];
        const missingFields = requiredFields.filter(field => !data[field]);
        
        if (missingFields.length) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        if (data.amount <= 0) {
            throw new Error('Invalid payment amount');
        }
    }

    /**
     * Process Stripe payment
     * @param {Object} data Payment data
     * @returns {Promise<Object>} Payment result
     * @private
     */
    async stripePayment(data) {
        const stripe = require('stripe')(this.config.apiKey);
        
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(data.amount * 100), // Convert to cents
                currency: data.currency.toLowerCase(),
                payment_method: data.payment_method,
                confirmation_method: 'manual',
                confirm: true,
                return_url: data.return_url
            });
            
            return {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: data.amount,
                currency: data.currency,
                provider: 'stripe'
            };
        } catch (error) {
            throw new Error(`Stripe payment failed: ${error.message}`);
        }
    }

    /**
     * Process Square payment
     * @param {Object} data Payment data
     * @returns {Promise<Object>} Payment result
     * @private
     */
    async squarePayment(data) {
        const { Client, Environment } = require('square');
        
        const client = new Client({
            accessToken: this.config.apiKey,
            environment: this.config.environment === 'production' ? 
                Environment.Production : Environment.Sandbox
        });
        
        try {
            const response = await client.paymentsApi.createPayment({
                sourceId: data.payment_method,
                amountMoney: {
                    amount: Math.round(data.amount * 100),
                    currency: data.currency
                },
                idempotencyKey: data.idempotencyKey || Date.now().toString()
            });
            
            return {
                id: response.result.payment.id,
                status: response.result.payment.status,
                amount: data.amount,
                currency: data.currency,
                provider: 'square'
            };
        } catch (error) {
            throw new Error(`Square payment failed: ${error.message}`);
        }
    }

    /**
     * Process PayPal payment
     * @param {Object} data Payment data
     * @returns {Promise<Object>} Payment result
     * @private
     */
    async paypalPayment(data) {
        const paypal = require('@paypal/checkout-server-sdk');
        
        const environment = this.config.environment === 'production'
            ? new paypal.core.LiveEnvironment(this.config.clientId, this.config.clientSecret)
            : new paypal.core.SandboxEnvironment(this.config.clientId, this.config.clientSecret);
        
        const client = new paypal.core.PayPalHttpClient(environment);
        
        try {
            const request = new paypal.orders.OrdersCreateRequest();
            request.prefer('return=representation');
            request.requestBody({
                intent: 'CAPTURE',
                purchase_units: [{
                    amount: {
                        currency_code: data.currency,
                        value: data.amount.toString()
                    }
                }]
            });
            
            const response = await client.execute(request);
            
            return {
                id: response.result.id,
                status: response.result.status,
                amount: data.amount,
                currency: data.currency,
                provider: 'paypal'
            };
        } catch (error) {
            throw new Error(`PayPal payment failed: ${error.message}`);
        }
    }

    /**
     * Save transaction record
     * @param {Object} transaction Transaction details
     * @returns {Promise<void>}
     * @private
     */
    async saveTransaction(transaction) {
        try {
            await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...transaction,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Failed to save transaction:', error);
            // Don't throw here as payment was successful
        }
    }

    /**
     * Get transaction by ID
     * @param {string} transactionId Transaction ID
     * @returns {Promise<Object>} Transaction details
     */
    async getTransaction(transactionId) {
        const response = await fetch(`/api/transactions/${transactionId}`);
        if (!response.ok) {
            throw new Error('Transaction not found');
        }
        return response.json();
    }

    /**
     * Refund payment
     * @param {string} transactionId Transaction ID
     * @param {Object} refundData Refund details
     * @returns {Promise<Object>} Refund result
     */
    async refundPayment(transactionId, refundData = {}) {
        const transaction = await this.getTransaction(transactionId);
        const provider = this.providers[transaction.provider];
        
        if (!provider) {
            throw new Error(`Provider ${transaction.provider} not supported for refunds`);
        }
        
        try {
            const refund = await this.processRefund(transaction, refundData);
            await this.saveTransaction({
                ...refund,
                original_transaction_id: transactionId,
                type: 'refund'
            });
            
            return refund;
        } catch (error) {
            throw new Error(`Refund failed: ${error.message}`);
        }
    }

    /**
     * Process refund based on provider
     * @param {Object} transaction Original transaction
     * @param {Object} refundData Refund details
     * @returns {Promise<Object>} Refund result
     * @private
     */
    async processRefund(transaction, refundData) {
        switch (transaction.provider) {
            case 'stripe':
                return this.stripeRefund(transaction, refundData);
            case 'square':
                return this.squareRefund(transaction, refundData);
            case 'paypal':
                return this.paypalRefund(transaction, refundData);
            default:
                throw new Error(`Refunds not supported for provider ${transaction.provider}`);
        }
    }

    /**
     * Process Stripe refund
     * @param {Object} transaction Original transaction
     * @param {Object} refundData Refund details
     * @returns {Promise<Object>} Refund result
     * @private
     */
    async stripeRefund(transaction, refundData) {
        const stripe = require('stripe')(this.config.apiKey);
        
        const refund = await stripe.refunds.create({
            payment_intent: transaction.id,
            amount: refundData.amount ? Math.round(refundData.amount * 100) : undefined
        });
        
        return {
            id: refund.id,
            status: refund.status,
            amount: refund.amount / 100,
            currency: transaction.currency,
            provider: 'stripe'
        };
    }

    /**
     * Process Square refund
     * @param {Object} transaction Original transaction
     * @param {Object} refundData Refund details
     * @returns {Promise<Object>} Refund result
     * @private
     */
    async squareRefund(transaction, refundData) {
        const { Client, Environment } = require('square');
        
        const client = new Client({
            accessToken: this.config.apiKey,
            environment: this.config.environment === 'production' ? 
                Environment.Production : Environment.Sandbox
        });
        
        const response = await client.refundsApi.refundPayment({
            paymentId: transaction.id,
            amountMoney: {
                amount: refundData.amount ? Math.round(refundData.amount * 100) : undefined,
                currency: transaction.currency
            },
            idempotencyKey: Date.now().toString()
        });
        
        return {
            id: response.result.refund.id,
            status: response.result.refund.status,
            amount: refundData.amount || transaction.amount,
            currency: transaction.currency,
            provider: 'square'
        };
    }

    /**
     * Process PayPal refund
     * @param {Object} transaction Original transaction
     * @param {Object} refundData Refund details
     * @returns {Promise<Object>} Refund result
     * @private
     */
    async paypalRefund(transaction, refundData) {
        const paypal = require('@paypal/checkout-server-sdk');
        
        const environment = this.config.environment === 'production'
            ? new paypal.core.LiveEnvironment(this.config.clientId, this.config.clientSecret)
            : new paypal.core.SandboxEnvironment(this.config.clientId, this.config.clientSecret);
        
        const client = new paypal.core.PayPalHttpClient(environment);
        
        const request = new paypal.payments.CapturesRefundRequest(transaction.id);
        request.requestBody({
            amount: {
                value: refundData.amount?.toString() || transaction.amount.toString(),
                currency_code: transaction.currency
            }
        });
        
        const response = await client.execute(request);
        
        return {
            id: response.result.id,
            status: response.result.status,
            amount: refundData.amount || transaction.amount,
            currency: transaction.currency,
            provider: 'paypal'
        };
    }
}

export default PaymentGateway;
