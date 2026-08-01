import { PrismaClient } from "@prisma/client";
import { Role } from "../src/types/enums";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@stationeryerp.com";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log("Admin user already exists. Skipping seed.");
    return;
  }

  const passwordHash = await bcrypt.hash("Admin@12345", 12);

  const admin = await prisma.user.create({
    data: {
      name: "Shop Owner",
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log("Seeded admin user:", admin.email);
  console.log("Login with email: admin@stationeryerp.com / password: Admin@12345");

  // 1. Seed Categories
  const notebooks = await prisma.category.create({
    data: {
      name: "Notebooks",
      description: "Exercise books, diaries, spiral notebooks and journals",
    },
  });

  const pens = await prisma.category.create({
    data: {
      name: "Pens & Writing",
      description: "Ballpoint pens, gel pens, fountain pens, markers and highlighters",
    },
  });

  const office = await prisma.category.create({
    data: {
      name: "Office Supplies",
      description: "Staplers, paper clips, scissors, tape and desk organizers",
    },
  });

  console.log("Seeded categories: Notebooks, Pens & Writing, Office Supplies");

  // 2. Seed Products
  const p1 = await prisma.product.create({
    data: {
      name: "Premium A4 Spiral Notebook",
      description: "160 pages, ruled, 70gsm ivory paper, hardcover",
      sku: "NOTE-A4-SPI",
      barcode: "8901234567890",
      purchasePrice: 45.0,
      sellingPrice: 85.0,
      gst: 18,
      stock: 120,
      damagedStock: 0,
      reservedStock: 0,
      categoryId: notebooks.id,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      name: "Pilot Gel Pen Blue 0.5mm",
      description: "Fine line gel ink rollerball pen, refillable",
      sku: "PEN-PIL-BLU",
      barcode: "4902505163140",
      purchasePrice: 60.0,
      sellingPrice: 90.0,
      gst: 12,
      stock: 8,
      damagedStock: 4,
      reservedStock: 0,
      categoryId: pens.id,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      name: "Heavy Duty Desk Stapler",
      description: "Staples up to 25 sheets of paper, full strip, metal construction",
      sku: "OFF-STA-HDY",
      barcode: "074711544329",
      purchasePrice: 150.0,
      sellingPrice: 249.0,
      gst: 18,
      stock: 0,
      damagedStock: 0,
      reservedStock: 0,
      categoryId: office.id,
    },
  });

  console.log("Seeded default products with stock levels");

  // 3. Seed Stock Movements (Historical timestamps)
  const getPastDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  await prisma.stockMovement.createMany({
    data: [
      // Notebook movements
      {
        productId: p1.id,
        quantity: 150,
        type: "RECEIVED",
        costPrice: 45.0,
        unitPrice: 45.0,
        reason: "Initial supplier consignment",
        userId: admin.id,
        createdAt: getPastDate(5),
      },
      {
        productId: p1.id,
        quantity: -15,
        type: "SOLD",
        costPrice: 45.0,
        unitPrice: 85.0,
        reason: "POS Sale Ref #1001",
        userId: admin.id,
        createdAt: getPastDate(4),
      },
      {
        productId: p1.id,
        quantity: -10,
        type: "SOLD",
        costPrice: 45.0,
        unitPrice: 85.0,
        reason: "POS Sale Ref #1002",
        userId: admin.id,
        createdAt: getPastDate(2),
      },
      {
        productId: p1.id,
        quantity: -5,
        type: "SOLD",
        costPrice: 45.0,
        unitPrice: 85.0,
        reason: "POS Sale Ref #1003",
        userId: admin.id,
        createdAt: getPastDate(1),
      },

      // Gel Pen movements
      {
        productId: p2.id,
        quantity: 20,
        type: "RECEIVED",
        costPrice: 60.0,
        unitPrice: 60.0,
        reason: "Supplier direct delivery",
        userId: admin.id,
        createdAt: getPastDate(4),
      },
      {
        productId: p2.id,
        quantity: -8,
        type: "SOLD",
        costPrice: 60.0,
        unitPrice: 90.0,
        reason: "POS Sale Ref #1004",
        userId: admin.id,
        createdAt: getPastDate(2),
      },
      {
        productId: p2.id,
        quantity: -4,
        type: "DAMAGED",
        costPrice: 60.0,
        unitPrice: 60.0,
        reason: "Water damage in desk storage drawer",
        userId: admin.id,
        createdAt: getPastDate(1),
      },

      // Stapler movements
      {
        productId: p3.id,
        quantity: 5,
        type: "RECEIVED",
        costPrice: 150.0,
        unitPrice: 150.0,
        reason: "Restock parcel",
        userId: admin.id,
        createdAt: getPastDate(6),
      },
      {
        productId: p3.id,
        quantity: -5,
        type: "SOLD",
        costPrice: 150.0,
        unitPrice: 249.0,
        reason: "Bulk corporate office purchase",
        userId: admin.id,
        createdAt: getPastDate(3),
      },
    ],
  });

  console.log("Seeded stock movements and transaction timeline logs");

  // 4. Seed Suppliers
  const s1 = await prisma.supplier.create({
    data: {
      name: "Standard Stationery Wholesalers",
      contactName: "Rohan Verma",
      email: "rohan@stdwholesalers.com",
      phone: "9876543210",
      address: "Plot 42, Sector 18, Gurugram, Haryana",
      gstin: "06AAAAA1111A1Z1",
    },
  });

  const s2 = await prisma.supplier.create({
    data: {
      name: "WriteTech Ink Solutions",
      contactName: "Sneha Reddy",
      email: "orders@writetechink.com",
      phone: "8765432109",
      address: "A-50, Phase 2, Industrial Area, Hyderabad",
      gstin: "36BBBBB2222B2Z2",
    },
  });

  console.log("Seeded default suppliers");

  // 5. Seed Purchase Orders
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-0001`,
      supplierId: s1.id,
      status: "PENDING",
      totalAmount: 1800.0, // 40 notebooks * 45 cost
      userId: admin.id,
      items: {
        create: [
          {
            productId: p1.id,
            quantity: 40,
            unitCost: 45.0,
            totalCost: 1800.0,
          },
        ],
      },
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-0002`,
      supplierId: s2.id,
      status: "RECEIVED",
      totalAmount: 1800.0, // 20 gel pens * 60 + 4 staplers * 150
      userId: admin.id,
      items: {
        create: [
          {
            productId: p2.id,
            quantity: 20,
            unitCost: 60.0,
            totalCost: 1200.0,
          },
          {
            productId: p3.id,
            quantity: 4,
            unitCost: 150.0,
            totalCost: 600.0,
          },
        ],
      },
    },
  });

  console.log("Seeded purchase orders: draft and received POs");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
