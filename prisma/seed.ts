import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // ── Restaurant ──
  const restaurant = await prisma.restaurant.create({
    data: {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      email: "contact@demo-restaurant.com",
      phone: "+237 6XX XXX XXX",
      address: "123 Main Street",
      city: "Douala",
      country: "Cameroon",
      currency: "FCFA",
      taxRate: 19.25,
      serviceCharge: 10,
      isActive: true,
      plan: "premium",
    },
  });
  console.log("✅ Restaurant created:", restaurant.name);

  // ── Users ──
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Platform-level Super Admin (no restaurant)
  const superAdmin = await prisma.user.create({
    data: {
      email: "superadmin@restopo.com",
      password: hashedPassword,
      firstName: "Aziz",
      lastName: "Bakayoko",
      phone: "+225 0141152544",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });
  console.log("✅ Super Admin created:", superAdmin.email, "(no restaurant)");

  const users: Record<
    string,
    Awaited<ReturnType<typeof prisma.user.create>>
  > = {};
  users["SUPER_ADMIN"] = superAdmin;

  const userDefs = [
    {
      email: "admin@demo-restaurant.com",
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN" as const,
    },
    {
      email: "manager@demo-restaurant.com",
      firstName: "Paul",
      lastName: "Manager",
      role: "MANAGER" as const,
    },
    {
      email: "cashier@demo-restaurant.com",
      firstName: "Sarah",
      lastName: "Cashier",
      role: "CASHIER" as const,
    },
    {
      email: "waiter@demo-restaurant.com",
      firstName: "John",
      lastName: "Waiter",
      role: "WAITER" as const,
    },
    {
      email: "chef@demo-restaurant.com",
      firstName: "Marie",
      lastName: "Chef",
      role: "CHEF" as const,
    },
    {
      email: "bartender@demo-restaurant.com",
      firstName: "Eric",
      lastName: "Bartender",
      role: "BARTENDER" as const,
    },
  ];

  for (const def of userDefs) {
    const user = await prisma.user.create({
      data: {
        restaurantId: restaurant.id,
        email: def.email,
        password: hashedPassword,
        firstName: def.firstName,
        lastName: def.lastName,
        phone: `+237 6${Math.floor(10000000 + Math.random() * 90000000)}`,
        role: def.role,
        isActive: true,
      },
    });
    users[def.role] = user;
  }
  console.log("✅ Users created (7 roles)");

  // ── Tables ──
  const tables = await Promise.all(
    [
      {
        number: "1",
        capacity: 2,
        zone: "Main Hall",
        status: "AVAILABLE" as const,
      },
      {
        number: "2",
        capacity: 4,
        zone: "Main Hall",
        status: "OCCUPIED" as const,
      },
      {
        number: "3",
        capacity: 4,
        zone: "Main Hall",
        status: "AVAILABLE" as const,
      },
      {
        number: "4",
        capacity: 6,
        zone: "Main Hall",
        status: "RESERVED" as const,
      },
      {
        number: "5",
        capacity: 2,
        zone: "Terrace",
        status: "AVAILABLE" as const,
      },
      {
        number: "6",
        capacity: 4,
        zone: "Terrace",
        status: "OCCUPIED" as const,
      },
      { number: "7", capacity: 8, zone: "VIP", status: "AVAILABLE" as const },
      { number: "8", capacity: 10, zone: "VIP", status: "AVAILABLE" as const },
    ].map((t) =>
      prisma.table.create({
        data: { restaurantId: restaurant.id, ...t },
      }),
    ),
  );
  console.log("✅ Tables created");

  // ── Menu Categories ──
  const appetizers = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Entrées",
      description: "Starters and appetizers",
      sortOrder: 1,
      isActive: true,
    },
  });
  const mainCourses = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Plats Principaux",
      description: "Main courses",
      sortOrder: 2,
      isActive: true,
    },
  });
  const desserts = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Desserts",
      description: "Sweet treats",
      sortOrder: 3,
      isActive: true,
    },
  });
  const beverages = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      name: "Boissons",
      description: "Drinks and beverages",
      sortOrder: 4,
      isActive: true,
    },
  });
  console.log("✅ Menu categories created");

  // ── Menu Items ──
  const menuItemDefs = [
    {
      categoryId: appetizers.id,
      name: "Salade César",
      description: "Fresh romaine lettuce with Caesar dressing",
      price: 2500,
      cost: 800,
      preparationTime: 10,
      calories: 350,
      tags: ["vegetarian", "popular"],
      allergens: ["dairy", "eggs"],
    },
    {
      categoryId: appetizers.id,
      name: "Soupe du Jour",
      description: "Daily fresh soup",
      price: 1500,
      cost: 500,
      preparationTime: 5,
      calories: 200,
      tags: ["soup"],
      allergens: [],
    },
    {
      categoryId: appetizers.id,
      name: "Accras de Morue",
      description: "Cod fritters with spicy dip",
      price: 2000,
      cost: 700,
      preparationTime: 12,
      calories: 380,
      tags: ["popular", "seafood"],
      allergens: ["fish", "gluten"],
    },
    {
      categoryId: mainCourses.id,
      name: "Poulet Braisé",
      description: "Grilled chicken with vegetables",
      price: 4500,
      cost: 1800,
      preparationTime: 25,
      calories: 650,
      tags: ["popular", "chicken"],
      allergens: [],
    },
    {
      categoryId: mainCourses.id,
      name: "Poisson Grillé",
      description: "Fresh grilled fish with lemon",
      price: 6000,
      cost: 2500,
      preparationTime: 20,
      calories: 450,
      tags: ["seafood", "healthy"],
      allergens: ["fish"],
    },
    {
      categoryId: mainCourses.id,
      name: "Ndolé",
      description: "Traditional Cameroonian dish",
      price: 3500,
      cost: 1200,
      preparationTime: 30,
      calories: 550,
      tags: ["local", "popular"],
      allergens: ["peanuts"],
    },
    {
      categoryId: mainCourses.id,
      name: "Eru",
      description: "Traditional spinach-like vegetable stew",
      price: 3000,
      cost: 1000,
      preparationTime: 35,
      calories: 480,
      tags: ["local"],
      allergens: [],
    },
    {
      categoryId: mainCourses.id,
      name: "Steak Frites",
      description: "Grilled steak with fries",
      price: 7500,
      cost: 3500,
      preparationTime: 20,
      calories: 800,
      tags: ["popular"],
      allergens: ["gluten"],
    },
    {
      categoryId: desserts.id,
      name: "Tiramisu",
      description: "Classic Italian dessert",
      price: 2000,
      cost: 600,
      preparationTime: 5,
      calories: 400,
      tags: ["popular"],
      allergens: ["dairy", "eggs", "gluten"],
    },
    {
      categoryId: desserts.id,
      name: "Salade de Fruits",
      description: "Fresh fruit salad",
      price: 1500,
      cost: 500,
      preparationTime: 5,
      calories: 150,
      tags: ["healthy", "vegan"],
      allergens: [],
    },
    {
      categoryId: desserts.id,
      name: "Crème Brûlée",
      description: "Classic French custard",
      price: 2500,
      cost: 700,
      preparationTime: 8,
      calories: 350,
      tags: ["popular"],
      allergens: ["dairy", "eggs"],
    },
    {
      categoryId: beverages.id,
      name: "Jus de Mangue",
      description: "Fresh mango juice",
      price: 1000,
      cost: 300,
      preparationTime: 3,
      calories: 120,
      tags: ["fresh", "local"],
      allergens: [],
    },
    {
      categoryId: beverages.id,
      name: "Coca-Cola",
      description: "Soft drink",
      price: 500,
      cost: 200,
      preparationTime: 1,
      calories: 140,
      tags: [],
      allergens: [],
    },
    {
      categoryId: beverages.id,
      name: "Bière 33 Export",
      description: "Local lager beer",
      price: 800,
      cost: 350,
      preparationTime: 1,
      calories: 180,
      tags: ["local", "alcohol"],
      allergens: ["gluten"],
    },
    {
      categoryId: beverages.id,
      name: "Jus de Gingembre",
      description: "Spicy ginger juice",
      price: 800,
      cost: 250,
      preparationTime: 3,
      calories: 90,
      tags: ["fresh", "local"],
      allergens: [],
    },
  ];

  const menuItems = await Promise.all(
    menuItemDefs.map((item) =>
      prisma.menuItem.create({
        data: {
          restaurantId: restaurant.id,
          isAvailable: true,
          isActive: true,
          ...item,
        },
      }),
    ),
  );
  console.log("✅ Menu items created");

  // ── Inventory Items ──
  const inventoryDefs = [
    {
      name: "Chicken Breast",
      sku: "INV-001",
      unit: "kg",
      currentStock: 25,
      minStock: 5,
      unitCost: 3500,
      supplier: "Ferme du Sud",
      category: "Meat",
    },
    {
      name: "Fresh Fish",
      sku: "INV-002",
      unit: "kg",
      currentStock: 12,
      minStock: 3,
      unitCost: 4500,
      supplier: "Port de Douala",
      category: "Seafood",
    },
    {
      name: "Romaine Lettuce",
      sku: "INV-003",
      unit: "kg",
      currentStock: 8,
      minStock: 2,
      unitCost: 800,
      supplier: "Marché Central",
      category: "Vegetables",
    },
    {
      name: "Tomatoes",
      sku: "INV-004",
      unit: "kg",
      currentStock: 15,
      minStock: 3,
      unitCost: 600,
      supplier: "Marché Central",
      category: "Vegetables",
    },
    {
      name: "Onions",
      sku: "INV-005",
      unit: "kg",
      currentStock: 20,
      minStock: 5,
      unitCost: 400,
      supplier: "Marché Central",
      category: "Vegetables",
    },
    {
      name: "Palm Oil",
      sku: "INV-006",
      unit: "L",
      currentStock: 10,
      minStock: 3,
      unitCost: 1200,
      supplier: "Huilerie du Littoral",
      category: "Oils",
    },
    {
      name: "Rice",
      sku: "INV-007",
      unit: "kg",
      currentStock: 50,
      minStock: 10,
      unitCost: 500,
      supplier: "Import Riz SA",
      category: "Grains",
    },
    {
      name: "Coca-Cola (330ml)",
      sku: "INV-008",
      unit: "bottle",
      currentStock: 48,
      minStock: 12,
      unitCost: 200,
      supplier: "Coca-Cola Cameroon",
      category: "Beverages",
    },
    {
      name: "Mango",
      sku: "INV-009",
      unit: "kg",
      currentStock: 10,
      minStock: 3,
      unitCost: 800,
      supplier: "Marché Central",
      category: "Fruits",
    },
    {
      name: "Flour",
      sku: "INV-010",
      unit: "kg",
      currentStock: 2,
      minStock: 5,
      unitCost: 600,
      supplier: "Moulin d'Or",
      category: "Grains",
    },
    {
      name: "Eggs",
      sku: "INV-011",
      unit: "piece",
      currentStock: 60,
      minStock: 20,
      unitCost: 100,
      supplier: "Ferme du Sud",
      category: "Dairy",
    },
    {
      name: "Sugar",
      sku: "INV-012",
      unit: "kg",
      currentStock: 15,
      minStock: 5,
      unitCost: 700,
      supplier: "SOSUCAM",
      category: "Condiments",
    },
    {
      name: "Ginger",
      sku: "INV-013",
      unit: "kg",
      currentStock: 4,
      minStock: 1,
      unitCost: 1500,
      supplier: "Marché Central",
      category: "Spices",
    },
    {
      name: "Beer 33 Export",
      sku: "INV-014",
      unit: "bottle",
      currentStock: 36,
      minStock: 12,
      unitCost: 350,
      supplier: "SABC",
      category: "Beverages",
    },
    {
      name: "Beef Steak",
      sku: "INV-015",
      unit: "kg",
      currentStock: 8,
      minStock: 3,
      unitCost: 6000,
      supplier: "Boucherie Moderne",
      category: "Meat",
    },
  ];

  const inventoryItems = await Promise.all(
    inventoryDefs.map((item) =>
      prisma.inventoryItem.create({
        data: { restaurantId: restaurant.id, isActive: true, ...item },
      }),
    ),
  );
  console.log("✅ Inventory items created");

  // ── Inventory Movements ──
  for (const inv of inventoryItems) {
    await prisma.inventoryMovement.create({
      data: {
        restaurantId: restaurant.id,
        itemId: inv.id,
        type: "IN",
        quantity: inv.currentStock,
        unitCost: inv.unitCost || 0,
        totalCost: inv.currentStock * (inv.unitCost || 0),
        reference: "Initial Stock",
        notes: "Opening inventory",
      },
    });
  }
  console.log("✅ Inventory movements created");

  // ── Customers ──
  const customers = await Promise.all(
    [
      {
        firstName: "Jean",
        lastName: "Mbarga",
        phone: "+237 677000001",
        email: "jean@example.com",
        loyaltyPoints: 150,
        totalSpent: 45000,
        visitCount: 12,
      },
      {
        firstName: "Aïssa",
        lastName: "Ngo",
        phone: "+237 677000002",
        email: "aissa@example.com",
        loyaltyPoints: 80,
        totalSpent: 28000,
        visitCount: 7,
      },
      {
        firstName: "Pierre",
        lastName: "Fotso",
        phone: "+237 677000003",
        email: "pierre@example.com",
        loyaltyPoints: 250,
        totalSpent: 78000,
        visitCount: 20,
      },
      {
        firstName: "Carine",
        lastName: "Biya",
        phone: "+237 677000004",
        email: "carine@example.com",
        loyaltyPoints: 30,
        totalSpent: 12000,
        visitCount: 3,
      },
      {
        firstName: "David",
        lastName: "Eto'o",
        phone: "+237 677000005",
        email: "david@example.com",
        loyaltyPoints: 500,
        totalSpent: 150000,
        visitCount: 35,
      },
    ].map((c) =>
      prisma.customer.create({
        data: { restaurantId: restaurant.id, isActive: true, ...c },
      }),
    ),
  );
  console.log("✅ Customers created");

  // ── Reservations ──
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  await Promise.all([
    prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        tableId: tables[3].id,
        customerId: customers[0].id,
        customerName: "Jean Mbarga",
        customerPhone: "+237 677000001",
        guestCount: 4,
        date: today,
        startTime: new Date(today.getTime() + 12 * 3600000),
        endTime: new Date(today.getTime() + 14 * 3600000),
        status: "CONFIRMED",
        notes: "Birthday celebration",
      },
    }),
    prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        tableId: tables[6].id,
        customerId: customers[2].id,
        customerName: "Pierre Fotso",
        customerPhone: "+237 677000003",
        guestCount: 6,
        date: new Date(today.getTime() + 86400000),
        startTime: new Date(today.getTime() + 86400000 + 19 * 3600000),
        endTime: new Date(today.getTime() + 86400000 + 21 * 3600000),
        status: "PENDING",
        notes: "Business dinner — VIP room requested",
      },
    }),
    prisma.reservation.create({
      data: {
        restaurantId: restaurant.id,
        customerId: customers[4].id,
        customerName: "David Eto'o",
        customerPhone: "+237 677000005",
        guestCount: 2,
        date: today,
        startTime: new Date(today.getTime() + 18 * 3600000),
        status: "CONFIRMED",
      },
    }),
  ]);
  console.log("✅ Reservations created");

  // ── Orders (mix of statuses) ──
  const waiter = users["WAITER"];
  const admin = users["ADMIN"];
  const cashier = users["CASHIER"];

  // Helper to pick random menu items
  const pick = (idx: number) => menuItems[idx];

  // Order 1 — PAID (waiter created, table 2)
  const order1 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tables[1].id,
      userId: waiter.id,
      customerId: customers[0].id,
      orderNumber: "ORD-001",
      status: "PAID",
      paymentStatus: "PAID",
      paymentMethod: "CASH",
      subtotal: 8500,
      tax: 1636,
      serviceCharge: 850,
      discount: 0,
      total: 10986,
      guestCount: 2,
      createdAt: new Date(now.getTime() - 3600000 * 3),
      completedAt: new Date(now.getTime() - 3600000 * 2),
      items: {
        create: [
          {
            menuItemId: pick(3).id,
            quantity: 1,
            unitPrice: 4500,
            total: 4500,
            status: "SERVED",
          },
          {
            menuItemId: pick(0).id,
            quantity: 1,
            unitPrice: 2500,
            total: 2500,
            status: "SERVED",
          },
          {
            menuItemId: pick(11).id,
            quantity: 1,
            unitPrice: 1000,
            total: 1000,
            status: "SERVED",
          },
          {
            menuItemId: pick(12).id,
            quantity: 1,
            unitPrice: 500,
            total: 500,
            status: "SERVED",
          },
        ],
      },
    },
  });

  // Order 2 — PREPARING (waiter created, table 6)
  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tables[5].id,
      userId: waiter.id,
      customerId: customers[2].id,
      orderNumber: "ORD-002",
      status: "PREPARING",
      paymentStatus: "PENDING",
      subtotal: 17500,
      tax: 3369,
      serviceCharge: 1750,
      discount: 0,
      total: 22619,
      guestCount: 4,
      createdAt: new Date(now.getTime() - 3600000),
      items: {
        create: [
          {
            menuItemId: pick(7).id,
            quantity: 2,
            unitPrice: 7500,
            total: 15000,
            status: "PREPARING",
            sentToKitchenAt: new Date(now.getTime() - 3000000),
          },
          {
            menuItemId: pick(0).id,
            quantity: 1,
            unitPrice: 2500,
            total: 2500,
            status: "READY",
            sentToKitchenAt: new Date(now.getTime() - 3000000),
            readyAt: new Date(now.getTime() - 1800000),
          },
        ],
      },
    },
  });

  // Order 3 — PENDING (admin created, no table — takeaway)
  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      userId: admin.id,
      orderNumber: "ORD-003",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 5500,
      tax: 1059,
      serviceCharge: 550,
      discount: 500,
      total: 6609,
      guestCount: 1,
      notes: "Takeaway — extra sauce please",
      createdAt: new Date(now.getTime() - 1800000),
      items: {
        create: [
          {
            menuItemId: pick(5).id,
            quantity: 1,
            unitPrice: 3500,
            total: 3500,
            status: "PENDING",
          },
          {
            menuItemId: pick(8).id,
            quantity: 1,
            unitPrice: 2000,
            total: 2000,
            status: "PENDING",
          },
        ],
      },
    },
  });

  // Order 4 — SERVED but unpaid (cashier created, table 2)
  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tables[1].id,
      userId: cashier.id,
      customerId: customers[4].id,
      orderNumber: "ORD-004",
      status: "SERVED",
      paymentStatus: "PENDING",
      subtotal: 12000,
      tax: 2310,
      serviceCharge: 1200,
      discount: 0,
      total: 15510,
      guestCount: 2,
      createdAt: new Date(now.getTime() - 7200000),
      items: {
        create: [
          {
            menuItemId: pick(4).id,
            quantity: 1,
            unitPrice: 6000,
            total: 6000,
            status: "SERVED",
            servedAt: new Date(now.getTime() - 5400000),
          },
          {
            menuItemId: pick(5).id,
            quantity: 1,
            unitPrice: 3500,
            total: 3500,
            status: "SERVED",
            servedAt: new Date(now.getTime() - 5400000),
          },
          {
            menuItemId: pick(10).id,
            quantity: 1,
            unitPrice: 2500,
            total: 2500,
            status: "SERVED",
            servedAt: new Date(now.getTime() - 4800000),
          },
        ],
      },
    },
  });

  // Order 5 — CANCELLED
  await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      userId: waiter.id,
      orderNumber: "ORD-005",
      status: "CANCELLED",
      paymentStatus: "PENDING",
      subtotal: 3000,
      tax: 578,
      serviceCharge: 300,
      discount: 0,
      total: 3878,
      guestCount: 1,
      notes: "Customer left",
      createdAt: new Date(now.getTime() - 86400000),
      items: {
        create: [
          {
            menuItemId: pick(6).id,
            quantity: 1,
            unitPrice: 3000,
            total: 3000,
            status: "CANCELLED",
          },
        ],
      },
    },
  });

  // Order 6 — PAID (yesterday, for reports data)
  const order6 = await prisma.order.create({
    data: {
      restaurantId: restaurant.id,
      tableId: tables[0].id,
      userId: waiter.id,
      customerId: customers[1].id,
      orderNumber: "ORD-006",
      status: "PAID",
      paymentStatus: "PAID",
      paymentMethod: "CARD",
      subtotal: 9500,
      tax: 1829,
      serviceCharge: 950,
      discount: 0,
      total: 12279,
      guestCount: 2,
      createdAt: new Date(now.getTime() - 86400000),
      completedAt: new Date(now.getTime() - 82800000),
      items: {
        create: [
          {
            menuItemId: pick(4).id,
            quantity: 1,
            unitPrice: 6000,
            total: 6000,
            status: "SERVED",
          },
          {
            menuItemId: pick(5).id,
            quantity: 1,
            unitPrice: 3500,
            total: 3500,
            status: "SERVED",
          },
        ],
      },
    },
  });

  console.log("✅ Orders created (6 orders, various statuses)");

  // ── Payments ──
  await prisma.payment.create({
    data: {
      orderId: order1.id,
      amount: 10986,
      method: "CASH",
      reference: "PAY-001",
      notes: "Full payment",
    },
  });
  await prisma.payment.create({
    data: {
      orderId: order6.id,
      amount: 12279,
      method: "CARD",
      reference: "PAY-002",
      notes: "Visa ending 4242",
    },
  });
  console.log("✅ Payments created");

  // ── Recipes (link some menu items to inventory) ──
  const pouletBraise = menuItems[3]; // Poulet Braisé
  const poissonGrille = menuItems[4]; // Poisson Grillé
  const chicken = inventoryItems[0]; // Chicken Breast
  const fish = inventoryItems[1]; // Fresh Fish
  const tomatoes = inventoryItems[3]; // Tomatoes
  const onions = inventoryItems[4]; // Onions
  const palmOil = inventoryItems[5]; // Palm Oil
  const rice = inventoryItems[6]; // Rice

  await prisma.recipe.create({
    data: {
      restaurantId: restaurant.id,
      menuItemId: pouletBraise.id,
      portionSize: 1,
      notes: "Marinate chicken at least 2 hours before grilling",
      ingredients: {
        create: [
          { itemId: chicken.id, quantity: 0.4, unit: "kg" },
          { itemId: tomatoes.id, quantity: 0.15, unit: "kg" },
          { itemId: onions.id, quantity: 0.1, unit: "kg" },
          { itemId: palmOil.id, quantity: 0.05, unit: "L" },
          { itemId: rice.id, quantity: 0.2, unit: "kg" },
        ],
      },
    },
  });

  await prisma.recipe.create({
    data: {
      restaurantId: restaurant.id,
      menuItemId: poissonGrille.id,
      portionSize: 1,
      notes: "Use fresh lemon and parsley for garnish",
      ingredients: {
        create: [
          { itemId: fish.id, quantity: 0.35, unit: "kg" },
          { itemId: tomatoes.id, quantity: 0.1, unit: "kg" },
          { itemId: onions.id, quantity: 0.1, unit: "kg" },
          { itemId: rice.id, quantity: 0.2, unit: "kg" },
        ],
      },
    },
  });
  console.log("✅ Recipes created");

  // ── Cash Register + Session ──
  const register = await prisma.cashRegister.create({
    data: {
      restaurantId: restaurant.id,
      name: "Main Register",
      location: "Front Desk",
      isActive: true,
    },
  });

  await prisma.cashSession.create({
    data: {
      registerId: register.id,
      userId: cashier.id,
      openingAmount: 50000,
      openedAt: new Date(today.getTime() + 8 * 3600000),
      notes: "Morning shift",
    },
  });
  console.log("✅ Cash register & session created");

  // ── Loyalty Program ──
  await prisma.loyaltyProgram.create({
    data: {
      restaurantId: restaurant.id,
      name: "Points de Fidélité",
      pointsPerAmount: 1,
      amountPerPoint: 100,
      minRedemption: 500,
      isActive: true,
    },
  });
  console.log("✅ Loyalty program created");

  // ── Shifts ──
  await Promise.all([
    prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        userId: waiter.id,
        startTime: new Date(today.getTime() + 8 * 3600000),
        endTime: new Date(today.getTime() + 16 * 3600000),
        status: "STARTED",
        notes: "Morning shift",
      },
    }),
    prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        userId: users["CHEF"].id,
        startTime: new Date(today.getTime() + 7 * 3600000),
        endTime: new Date(today.getTime() + 15 * 3600000),
        status: "STARTED",
        notes: "Kitchen morning shift",
      },
    }),
    prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        userId: users["BARTENDER"].id,
        startTime: new Date(today.getTime() + 16 * 3600000),
        endTime: new Date(today.getTime() + 24 * 3600000),
        status: "SCHEDULED",
        notes: "Evening shift",
      },
    }),
    prisma.shift.create({
      data: {
        restaurantId: restaurant.id,
        userId: cashier.id,
        startTime: new Date(today.getTime() + 8 * 3600000),
        endTime: new Date(today.getTime() + 16 * 3600000),
        status: "STARTED",
        notes: "Register duty",
      },
    }),
  ]);
  console.log("✅ Shifts created");

  // ── Promotions ──
  await prisma.promotion.create({
    data: {
      restaurantId: restaurant.id,
      name: "Happy Hour Drinks",
      description: "50% off all beverages between 4-6pm",
      discountType: "percentage",
      discountValue: 50,
      startDate: today,
      endDate: new Date(today.getTime() + 30 * 86400000),
      isActive: true,
    },
  });
  console.log("✅ Promotions created");

  // ── Summary ──
  console.log("\n🎉 Seeding completed successfully!\n");
  console.log("═══════════════════════════════════════════════════");
  console.log("  📝 LOGIN CREDENTIALS (password: password123)");
  console.log("═══════════════════════════════════════════════════");
  console.log(
    "  🛡️  SUPER_ADMIN  → superadmin@restopo.com (no Restaurant ID needed)",
  );
  console.log("  ADMIN        → admin@demo-restaurant.com");
  console.log("  MANAGER      → manager@demo-restaurant.com");
  console.log("  CASHIER      → cashier@demo-restaurant.com");
  console.log("  WAITER       → waiter@demo-restaurant.com");
  console.log("  CHEF         → chef@demo-restaurant.com");
  console.log("  BARTENDER    → bartender@demo-restaurant.com");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  🏪 Restaurant ID: ${restaurant.id}`);
  console.log("═══════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
