# 🏗️ Architecture Documentation

## System Overview

This is a multi-tenant restaurant management system designed to handle multiple restaurants from a single codebase with complete data isolation.

## Multi-Tenant Architecture

### Data Isolation Strategy

Every database table includes a `restaurantId` field that ensures complete data separation between tenants:

```typescript
// All queries automatically filter by restaurantId
const orders = await prisma.order.findMany({
  where: { restaurantId: req.user.restaurantId }
});
```

### Tenant Identification

1. **Authentication**: User logs in with email + restaurantId
2. **JWT Token**: Contains restaurantId in payload
3. **Middleware**: Validates tenant access on every request
4. **Database**: Enforces isolation through composite unique constraints

## Technology Stack

### Backend

- **Express.js**: Web framework
- **TypeScript**: Type safety
- **Prisma**: ORM with type-safe queries
- **PostgreSQL**: Primary database
- **Redis**: Caching and session management
- **Socket.IO**: Real-time communication
- **Bull**: Job queue for async tasks

### Security

- **JWT**: Stateless authentication
- **bcrypt**: Password hashing (10 rounds)
- **Helmet**: Security headers
- **CORS**: Cross-origin protection
- **Rate Limiting**: DDoS protection

## Module Architecture

### 1. Order Management

**Flow:**
```
Waiter creates order → Order saved → WebSocket notification → Kitchen display updates
```

**Features:**
- Real-time order status updates
- Automatic tax and service charge calculation
- Order item tracking (pending → preparing → ready → served)
- Table status management
- Split orders support

### 2. Menu Management

**Structure:**
```
Restaurant → MenuCategory → MenuItem → Recipe → RecipeIngredient → InventoryItem
```

**Features:**
- Hierarchical menu organization
- Dynamic availability toggle
- Cost tracking for profit analysis
- Allergen and dietary information
- Preparation time estimates

### 3. Inventory Management (Coming Soon)

**Auto-deduction Logic:**
```
Order placed → Recipe ingredients identified → Stock deducted → Low stock alert
```

**Features:**
- Multi-location inventory (kitchen, bar, storage)
- Automatic stock consumption based on recipes
- Low stock alerts
- Movement tracking (in, out, transfer, loss)
- Supplier management

### 4. POS/Cashier Module (Coming Soon)

**Features:**
- Fast order entry
- Multiple payment methods (cash, card, mobile money)
- Split payments
- Discount application
- Receipt printing (ESC/POS)
- Cash drawer management
- End-of-day Z report

### 5. Staff Management (Coming Soon)

**Features:**
- Shift scheduling
- Clock in/out tracking
- Hour calculation
- Leave management
- Performance metrics
- Role-based permissions

### 6. Reservation System (Coming Soon)

**Features:**
- Interactive floor plan
- Online booking
- Confirmation notifications (email/SMS)
- Waitlist management
- Customer preferences tracking

### 7. Analytics & Reporting (Coming Soon)

**Metrics:**
- Daily/monthly/yearly revenue
- Sales by category/item/server
- Table turnover rate
- Food cost percentage
- Profit margins
- Customer analytics

## Database Schema Design

### Core Entities

```
Restaurant (Tenant)
├── Users (Staff)
├── Tables
├── MenuCategories
│   └── MenuItems
│       └── Recipes
│           └── RecipeIngredients
│               └── InventoryItems
├── Orders
│   ├── OrderItems
│   └── Payments
├── Customers
│   └── Reservations
├── Shifts
├── CashRegisters
│   └── CashSessions
└── LoyaltyPrograms
```

### Key Relationships

- **One-to-Many**: Restaurant → Users, Tables, Orders
- **Many-to-One**: Order → Table, User
- **Many-to-Many**: MenuItem ↔ InventoryItem (through Recipe)

## API Design

### RESTful Conventions

```
GET    /api/v1/orders          # List orders
POST   /api/v1/orders          # Create order
GET    /api/v1/orders/:id      # Get order
PATCH  /api/v1/orders/:id      # Update order
DELETE /api/v1/orders/:id      # Cancel order
```

### Authentication Flow

```
1. POST /auth/login → Returns access token + refresh token
2. Include token in header: Authorization: Bearer <token>
3. Middleware validates token and extracts user info
4. Request proceeds with req.user populated
```

## Real-Time Communication

### Socket.IO Events

**Server → Client:**
- `order:created` - New order placed
- `order:updated` - Order status changed
- `order:item:updated` - Item status changed
- `order:cancelled` - Order cancelled

**Client → Server:**
- `join:restaurant` - Subscribe to restaurant updates
- `leave:restaurant` - Unsubscribe

### Room Strategy

Each restaurant has its own Socket.IO room:
```typescript
socket.join(`restaurant:${restaurantId}`);
io.to(`restaurant:${restaurantId}`).emit('order:created', order);
```

## Error Handling

### Error Types

1. **Operational Errors** (handled gracefully):
   - Validation errors (400)
   - Authentication errors (401)
   - Authorization errors (403)
   - Not found errors (404)

2. **Programming Errors** (logged and monitored):
   - Syntax errors
   - Type errors
   - Unhandled exceptions

### Error Response Format

```json
{
  "error": "Human-readable message",
  "details": [
    {
      "path": "field.name",
      "message": "Validation message"
    }
  ]
}
```

## Caching Strategy

### Redis Usage

1. **Session Storage**: User sessions and tokens
2. **Cache**: Frequently accessed data (menu items, restaurant config)
3. **Queue**: Async job processing (email, SMS, reports)
4. **Rate Limiting**: Request throttling

### Cache Invalidation

- **Time-based**: TTL for each cache entry
- **Event-based**: Invalidate on data updates
- **Manual**: Admin can clear cache

## Scalability Considerations

### Horizontal Scaling

- Stateless API servers (can add more instances)
- Redis for shared state
- PostgreSQL connection pooling
- Load balancer distribution

### Performance Optimization

- Database indexing on frequently queried fields
- Pagination for large datasets
- Lazy loading for related data
- Query optimization with Prisma

### Future Enhancements

- Read replicas for PostgreSQL
- CDN for static assets
- Microservices for heavy modules
- Message queue (RabbitMQ/Kafka)

## Security Best Practices

1. **Authentication**: JWT with short expiration
2. **Authorization**: Role-based access control
3. **Input Validation**: Zod schemas for all inputs
4. **SQL Injection**: Prisma parameterized queries
5. **XSS Protection**: Helmet middleware
6. **CSRF**: Token-based protection
7. **Rate Limiting**: Per-IP and per-user limits
8. **Secrets**: Environment variables, never hardcoded

## Deployment Architecture

### Production Setup

```
Internet
    ↓
Load Balancer (Nginx/Cloudflare)
    ↓
API Servers (PM2/Docker)
    ↓
PostgreSQL (Primary + Replica)
    ↓
Redis Cluster
```

### Monitoring

- **Logs**: Winston → File/Cloud service
- **Errors**: Sentry for error tracking
- **Metrics**: Prometheus + Grafana
- **Uptime**: Pingdom/UptimeRobot

## Development Workflow

1. **Local Development**: `npm run dev`
2. **Database Changes**: Prisma migrations
3. **Testing**: Unit + Integration tests
4. **Code Review**: Pull requests
5. **CI/CD**: Automated testing and deployment
6. **Staging**: Pre-production testing
7. **Production**: Blue-green deployment
