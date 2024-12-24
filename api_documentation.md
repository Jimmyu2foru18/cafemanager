# CaféManager API Documentation

## Overview

The CaféManager API provides a comprehensive set of endpoints for managing café operations, including order processing, inventory management, customer data, and analytics.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

All API requests require authentication using JWT tokens. Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

## Rate Limiting

- Standard rate limit: 1000 requests per hour
- Analytics endpoints: 100 requests per hour
- Bulk operations: 10 requests per hour

## Endpoints

### Orders

#### Create Order
```http
POST /orders
```

Request body:
```json
{
    "customer_id": "string",
    "items": [
        {
            "menu_item_id": "string",
            "quantity": "number",
            "notes": "string",
            "modifications": []
        }
    ],
    "table_number": "string?",
    "type": "dine_in|takeaway|online"
}
```

Response:
```json
{
    "order_id": "string",
    "status": "pending",
    "total": "number",
    "estimated_time": "number"
}
```

#### Get Order Status
```http
GET /orders/{order_id}
```

Response:
```json
{
    "order_id": "string",
    "status": "string",
    "items": [],
    "timeline": []
}
```

### Inventory

#### Get Stock Levels
```http
GET /inventory
```

Query parameters:
- `category` (string): Filter by category
- `low_stock` (boolean): Only show low stock items
- `page` (number): Page number for pagination
- `limit` (number): Items per page

Response:
```json
{
    "items": [
        {
            "id": "string",
            "name": "string",
            "quantity": "number",
            "unit": "string",
            "category": "string",
            "alert_threshold": "number"
        }
    ],
    "pagination": {
        "total": "number",
        "page": "number",
        "limit": "number",
        "hasMore": "boolean"
    }
}
```

### Analytics

#### Sales Analytics
```http
GET /analytics/sales
```

Query parameters:
- `start_date` (string): Start date (ISO 8601)
- `end_date` (string): End date (ISO 8601)
- `interval` (string): Data interval (hourly|daily|weekly|monthly)
- `category` (string): Filter by category

Response:
```json
{
    "total_revenue": "number",
    "comparison": {
        "previous_period": "number",
        "change_percentage": "number"
    },
    "trends": [
        {
            "timestamp": "string",
            "value": "number"
        }
    ],
    "top_items": []
}
```

#### Customer Analytics
```http
GET /analytics/customers
```

Query parameters:
- `segment` (string): Customer segment
- `period` (string): Analysis period

Response:
```json
{
    "segments": {
        "new": "number",
        "regular": "number",
        "frequent": "number",
        "inactive": "number"
    },
    "lifetime_value": {
        "average": "number",
        "distribution": []
    },
    "retention_rate": "number"
}
```

### Online Ordering

#### Get Menu
```http
GET /menu
```

Query parameters:
- `category` (string): Filter by category
- `available` (boolean): Only show available items
- `search` (string): Search term

Response:
```json
{
    "categories": [],
    "items": [
        {
            "id": "string",
            "name": "string",
            "description": "string",
            "price": "number",
            "category": "string",
            "image_url": "string",
            "available": "boolean",
            "customizations": []
        }
    ]
}
```

#### Place Online Order
```http
POST /orders/online
```

Request body:
```json
{
    "customer": {
        "id": "string?",
        "name": "string",
        "email": "string",
        "phone": "string"
    },
    "items": [
        {
            "menu_item_id": "string",
            "quantity": "number",
            "customizations": []
        }
    ],
    "delivery": {
        "address": "string",
        "instructions": "string"
    },
    "payment": {
        "method": "string",
        "details": {}
    }
}
```

Response:
```json
{
    "order_id": "string",
    "tracking_url": "string",
    "estimated_delivery": "string"
}
```

## Error Handling

The API uses standard HTTP response codes:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 429: Too Many Requests
- 500: Internal Server Error

Error response format:
```json
{
    "error": {
        "code": "string",
        "message": "string",
        "details": {}
    }
}
```

## Pagination

For endpoints that return lists, pagination is handled through query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
    "data": [],
    "pagination": {
        "total": "number",
        "page": "number",
        "limit": "number",
        "hasMore": "boolean"
    }
}
```

## WebSocket Events

The API provides real-time updates through WebSocket connections:

```javascript
const ws = new WebSocket('wss://your-domain.com/ws');

// Authentication
ws.send(JSON.stringify({
    type: 'auth',
    token: 'your_jwt_token'
}));

// Subscribe to events
ws.send(JSON.stringify({
    type: 'subscribe',
    channels: ['orders', 'inventory']
}));
```

### Event Types

- `order_update`: Order status changes
- `inventory_alert`: Low stock notifications
- `kitchen_update`: Kitchen preparation updates
- `delivery_update`: Delivery status updates

## Rate Limiting Headers

Response headers include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Caching

The API supports ETag caching. Include the If-None-Match header to utilize caching:

```http
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

## Versioning

The API is versioned through the URL path. The current version is v1.

## Support

For API support or questions, contact:
- Email: api-support@cafemanager.com
- Documentation: https://docs.cafemanager.com
- Status page: https://status.cafemanager.com
