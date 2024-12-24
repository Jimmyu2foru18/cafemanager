# CaféManager

A café management system designed to simplify order operations, manage inventory, and enhance customer service.

## Features

### Implemented Features 

#### Point of Sale (POS)
- Real-time order management
- Custom order modifications
- Payment processing
- Order status tracking
- Receipt generation
- Table management

#### Inventory Management
- Stock tracking
- Low stock alerts
- Automatic reorder suggestions
- Supplier management
- Stock adjustment history
- Inventory reports

#### Customer Management
- Customer profiles
- Order history
- Loyalty program
- Customer feedback system
- Marketing integration

#### Admin Dashboard
- Sales analytics
- Performance metrics
- Staff management
- Financial reporting
- Real-time monitoring

#### Security
- Role-based access control
- JWT authentication
- CSRF protection
- Secure session management
- Input validation
- XSS prevention

### Planned Features 
- Mobile app integration
- Advanced analytics
- AI-powered demand prediction
- Multi-location support
- Kitchen display system
- Online ordering integration

## Technology Stack

### Backend
- PHP 8.1+
- MySQL/MariaDB
- WebSocket Server (Ratchet)
- JWT Authentication
- Composer

### Frontend
- JavaScript (ES6+)
- HTML5/CSS3
- WebSocket Client
- Chart.js for analytics
- Responsive design

### Development Tools
- Git for version control
- PHPUnit for testing
- ESLint for JavaScript linting
- PHP_CodeSniffer
- Composer for dependency management
- npm for frontend packages

## Installation

1. **Clone the repository**
```bash
git clone https://github.com/jimmyu2foru18/cafemanager.git
cd cafemanager
```

2. **Install PHP dependencies**
```bash
composer install
```

3. **Install JavaScript dependencies**
```bash
npm install
```

4. **Database Setup**
```bash
mysql -u root -p < schema.sql
```
5. **Start WebSocket Server**
```bash
php websocket/server.php
```

6. **Start Development Server**
```bash
php -S localhost:8000
```

## Project Structure

All files are located in the root folder.

## Security Features

- CSRF token validation
- JWT token authentication
- Role-based access control
- Input sanitization
- Prepared statements
- Session security
- Password hashing (Argon2id)
- Rate limiting
- Request validation

## Performance Optimizations

- Database indexing
- Query optimization
- Request caching
- Rate limiting
- WebSocket for real-time updates
- Frontend asset optimization
- Response compression
- Database connection pooling

## Roadmap

- Mobile app development
- Advanced analytics dashboard
- API documentation
- Performance optimization
- Browser compatibility fixes
- Multi-location support
- Third-party integrations
- Offline mode support
- Advanced reporting features

## Authors

- Development Team @jimmyu2foru18
---