# 🍽️ Restaurant POS & Management System

A comprehensive multi-tenant restaurant management system built with Express.js, TypeScript, PostgreSQL, and Redis.

## 🚀 Features

### Phase 1: MVP (Core Features)
- ✅ Multi-tenant architecture with data isolation
- ✅ JWT authentication with role-based access control (RBAC)
- ✅ Order management system with real-time updates
- ✅ Menu management (categories & items)
- ✅ Table management
- ✅ WebSocket support for real-time notifications

### Upcoming Features
- 📦 Inventory management with automatic stock deduction
- 💰 POS/Cashier module with receipt printing
- 👥 Staff management and scheduling
- 📅 Table reservation system
- 📱 Digital menu with QR code ordering
- 📊 Analytics and reporting dashboard
- 🎁 Customer loyalty program
- 🌐 Offline mode with PWA

## 🛠️ Tech Stack

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL (Prisma ORM)
- **Cache/Queue**: Redis + Bull
- **Real-time**: Socket.IO
- **Authentication**: JWT + bcrypt
- **Validation**: Zod

### Frontend (Coming Soon)
- **Framework**: Next.js 14+ (App Router)
- **UI**: TailwindCSS + shadcn/ui
- **State**: React Query + Zustand
- **Charts**: Recharts

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- npm or yarn

## 🔧 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd windsurf-project
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/restaurant_pos"
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
```

4. **Generate Prisma client**
```bash
npm run prisma:generate
```

5. **Run database migrations**
```bash
npm run prisma:migrate
```

6. **Start the development server**
```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

## 📚 API Documentation

### Authentication

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "WAITER",
  "restaurantId": "restaurant-uuid"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "restaurantId": "restaurant-uuid"
}
```

#### Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer <access_token>
```

### Orders

#### Create Order
```http
POST /api/v1/orders
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "tableId": "table-uuid",
  "guestCount": 4,
  "items": [
    {
      "menuItemId": "item-uuid",
      "quantity": 2,
      "modifiers": { "spicy": true },
      "notes": "No onions"
    }
  ],
  "notes": "Birthday celebration"
}
```

#### Get Orders
```http
GET /api/v1/orders?status=PENDING&date=2024-01-15
Authorization: Bearer <access_token>
```

#### Update Order Status
```http
PATCH /api/v1/orders/:id/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "PREPARING"
}
```

### Menu

#### Get Categories
```http
GET /api/v1/menu/categories
Authorization: Bearer <access_token>
```

#### Create Menu Item
```http
POST /api/v1/menu/items
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "categoryId": "category-uuid",
  "name": "Burger Deluxe",
  "description": "Premium beef burger",
  "price": 5000,
  "cost": 2000,
  "preparationTime": 15,
  "tags": ["popular", "beef"],
  "allergens": ["gluten", "dairy"]
}
```

## 🏗️ Project Structure

```
src/
├── config/           # Configuration files (database, redis, logger)
├── controllers/      # Request handlers
├── middlewares/      # Express middlewares (auth, validation, error)
├── routes/           # API routes
├── utils/            # Utility functions (jwt, password)
├── types/            # TypeScript type definitions
├── app.ts            # Express app setup
└── server.ts         # Server entry point with Socket.IO

prisma/
├── schema.prisma     # Database schema
└── seed.ts           # Database seeding script
```

## 🔐 User Roles

- **SUPER_ADMIN**: Full system access
- **ADMIN**: Restaurant owner/admin
- **MANAGER**: Restaurant manager
- **CASHIER**: POS operations
- **WAITER**: Order taking
- **CHEF**: Kitchen operations
- **BARTENDER**: Bar operations

## 🔄 Order Status Flow

```
PENDING → CONFIRMED → PREPARING → READY → SERVED → PAID
                                      ↓
                                  CANCELLED
```

## 📊 Database Schema

The system uses a multi-tenant architecture where all data is isolated by `restaurantId`:

- **Restaurant**: Main tenant entity
- **User**: Staff members with roles
- **Table**: Restaurant tables
- **MenuCategory**: Menu categories
- **MenuItem**: Menu items
- **Order**: Customer orders
- **OrderItem**: Individual order items
- **InventoryItem**: Stock items
- **Customer**: Customer database
- **Reservation**: Table reservations
- **Shift**: Staff scheduling
- **CashRegister**: POS registers

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure proper CORS origins
- Set up SSL/TLS
- Configure Redis with password
- Use connection pooling for PostgreSQL

## 🧪 Testing

```bash
# Run tests (coming soon)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 License

MIT

## 👥 Contributing

Contributions are welcome! Please read the contributing guidelines first.

## 📞 Support

For support, email support@restaurant-pos.com or open an issue.
