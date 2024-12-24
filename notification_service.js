/**
 * Notification Service
 *
 * This class handles various types of notifications within the CaféManager application,
 * including email, SMS, and push notifications. It provides a unified interface for sending
 * notifications through different channels, allowing for flexible communication with users.
 *
 * Key Features:
 * - **Email Notifications**: Configures and sends email notifications using a specified email
 *   service (e.g., SendGrid). Requires an API key and sender email address.
 * - **SMS Notifications**: Sends SMS messages using a specified service (e.g., Twilio), requiring
 *   account credentials and a sender phone number.
 * - **Push Notifications**: Supports sending push notifications via a push notification service
 *   (e.g., Firebase).
 *
 * Configuration:
 * The service is initialized with configuration options for each notification type, which can be
 * set through environment variables or default values.
 *
 * Usage:
 * To use this service, instantiate it and call the appropriate methods for sending notifications:
 *
 * ```javascript
 * const notificationService = new NotificationService();
 * notificationService.sendEmail({ to: 'user@example.com', subject: 'Welcome!', body: 'Hello!' });
 * notificationService.sendSMS({ to: '+1234567890', message: 'Your order has been shipped!' });
 * ```
 *
 * Ensure that the necessary environment variables are set for the services being used before
 * running the application.
 */

class NotificationService {
    constructor(config = {}) {
        this.config = {
            email: {
                service: process.env.EMAIL_SERVICE || 'sendgrid',
                apiKey: process.env.EMAIL_API_KEY,
                from: process.env.EMAIL_FROM
            },
            sms: {
                service: process.env.SMS_SERVICE || 'twilio',
                accountSid: process.env.TWILIO_ACCOUNT_SID,
                authToken: process.env.TWILIO_AUTH_TOKEN,
                from: process.env.TWILIO_PHONE_NUMBER
            },
            push: {
                service: process.env.PUSH_SERVICE || 'firebase',
                credentials: process.env.FIREBASE_CREDENTIALS
            },
            ...config
        };
        
        this.templates = {
            order_confirmation: {
                email: {
                    subject: 'Order Confirmation - #{order_id}',
                    template: 'order_confirmation_email'
                },
                sms: {
                    template: 'order_confirmation_sms'
                }
            },
            order_status: {
                email: {
                    subject: 'Order Status Update - #{order_id}',
                    template: 'order_status_email'
                },
                sms: {
                    template: 'order_status_sms'
                }
            },
            low_stock: {
                email: {
                    subject: 'Low Stock Alert',
                    template: 'low_stock_email'
                }
            }
        };
    }

    /**
     * Send notification
     * @param {Object} params Notification parameters
     * @returns {Promise<Object>} Notification result
     */
    async send(params) {
        try {
            this.validateParams(params);
            
            const template = this.templates[params.type];
            if (!template) {
                throw new Error(`Unknown notification type: ${params.type}`);
            }
            
            const results = await Promise.all([
                this.sendEmail(params, template.email),
                this.sendSMS(params, template.sms),
                this.sendPushNotification(params)
            ]);
            
            await this.saveNotification({
                type: params.type,
                recipient: params.recipient,
                data: params.data,
                results
            });
            
            return {
                success: true,
                results
            };
        } catch (error) {
            console.error('Notification error:', error);
            throw error;
        }
    }

    /**
     * Validate notification parameters
     * @param {Object} params Notification parameters
     * @throws {Error} Validation error
     * @private
     */
    validateParams(params) {
        if (!params.type) {
            throw new Error('Notification type is required');
        }
        
        if (!params.recipient) {
            throw new Error('Recipient is required');
        }
        
        if (!params.data) {
            throw new Error('Notification data is required');
        }
    }

    /**
     * Send email notification
     * @param {Object} params Notification parameters
     * @param {Object} template Email template
     * @returns {Promise<Object>} Email result
     * @private
     */
    async sendEmail(params, template) {
        if (!template || !this.isValidEmail(params.recipient)) {
            return null;
        }
        
        switch (this.config.email.service) {
            case 'sendgrid':
                return this.sendSendGridEmail(params, template);
            case 'mailgun':
                return this.sendMailgunEmail(params, template);
            default:
                throw new Error(`Unsupported email service: ${this.config.email.service}`);
        }
    }

    /**
     * Send SMS notification
     * @param {Object} params Notification parameters
     * @param {Object} template SMS template
     * @returns {Promise<Object>} SMS result
     * @private
     */
    async sendSMS(params, template) {
        if (!template || !this.isValidPhone(params.recipient)) {
            return null;
        }
        
        switch (this.config.sms.service) {
            case 'twilio':
                return this.sendTwilioSMS(params, template);
            default:
                throw new Error(`Unsupported SMS service: ${this.config.sms.service}`);
        }
    }

    /**
     * Send push notification
     * @param {Object} params Notification parameters
     * @returns {Promise<Object>} Push notification result
     * @private
     */
    async sendPushNotification(params) {
        if (!params.pushToken) {
            return null;
        }
        
        switch (this.config.push.service) {
            case 'firebase':
                return this.sendFirebasePush(params);
            default:
                throw new Error(`Unsupported push service: ${this.config.push.service}`);
        }
    }

    /**
     * Send email via SendGrid
     * @param {Object} params Notification parameters
     * @param {Object} template Email template
     * @returns {Promise<Object>} SendGrid result
     * @private
     */
    async sendSendGridEmail(params, template) {
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(this.config.email.apiKey);
        
        const msg = {
            to: params.recipient,
            from: this.config.email.from,
            templateId: template.template,
            dynamicTemplateData: {
                ...params.data,
                subject: this.replaceTemplateVars(template.subject, params.data)
            }
        };
        
        try {
            const result = await sgMail.send(msg);
            return {
                provider: 'sendgrid',
                messageId: result[0].headers['x-message-id'],
                status: 'sent'
            };
        } catch (error) {
            throw new Error(`SendGrid error: ${error.message}`);
        }
    }

    /**
     * Send email via Mailgun
     * @param {Object} params Notification parameters
     * @param {Object} template Email template
     * @returns {Promise<Object>} Mailgun result
     * @private
     */
    async sendMailgunEmail(params, template) {
        const mailgun = require('mailgun-js')({
            apiKey: this.config.email.apiKey,
            domain: this.config.email.domain
        });
        
        const data = {
            from: this.config.email.from,
            to: params.recipient,
            subject: this.replaceTemplateVars(template.subject, params.data),
            template: template.template,
            'h:X-Mailgun-Variables': JSON.stringify(params.data)
        };
        
        try {
            const result = await mailgun.messages().send(data);
            return {
                provider: 'mailgun',
                messageId: result.id,
                status: 'sent'
            };
        } catch (error) {
            throw new Error(`Mailgun error: ${error.message}`);
        }
    }

    /**
     * Send SMS via Twilio
     * @param {Object} params Notification parameters
     * @param {Object} template SMS template
     * @returns {Promise<Object>} Twilio result
     * @private
     */
    async sendTwilioSMS(params, template) {
        const twilio = require('twilio')(
            this.config.sms.accountSid,
            this.config.sms.authToken
        );
        
        try {
            const message = await twilio.messages.create({
                body: this.replaceTemplateVars(template.template, params.data),
                from: this.config.sms.from,
                to: params.recipient
            });
            
            return {
                provider: 'twilio',
                messageId: message.sid,
                status: message.status
            };
        } catch (error) {
            throw new Error(`Twilio error: ${error.message}`);
        }
    }

    /**
     * Send push notification via Firebase
     * @param {Object} params Notification parameters
     * @returns {Promise<Object>} Firebase result
     * @private
     */
    async sendFirebasePush(params) {
        const admin = require('firebase-admin');
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(JSON.parse(this.config.push.credentials))
            });
        }
        
        const message = {
            notification: {
                title: params.data.title,
                body: params.data.body
            },
            token: params.pushToken
        };
        
        try {
            const result = await admin.messaging().send(message);
            return {
                provider: 'firebase',
                messageId: result,
                status: 'sent'
            };
        } catch (error) {
            throw new Error(`Firebase error: ${error.message}`);
        }
    }

    /**
     * Save notification record
     * @param {Object} notification Notification details
     * @returns {Promise<void>}
     * @private
     */
    async saveNotification(notification) {
        try {
            await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...notification,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Failed to save notification:', error);
        }
    }

    /**
     * Replace template variables
     * @param {string} template Template string
     * @param {Object} data Template data
     * @returns {string} Processed template
     * @private
     */
    replaceTemplateVars(template, data) {
        return template.replace(/#{(\w+)}/g, (match, key) => data[key] || match);
    }

    /**
     * Validate email address
     * @param {string} email Email address
     * @returns {boolean} Validation result
     * @private
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validate phone number
     * @param {string} phone Phone number
     * @returns {boolean} Validation result
     * @private
     */
    isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s-]+$/;
        return phoneRegex.test(phone);
    }
}

export default NotificationService;
