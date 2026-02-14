import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create roles
  const adminRole = await prisma.role.upsert({
    where: { name: "Admin" },
    update: {},
    create: { name: "Admin" },
  });

  const officeManagerRole = await prisma.role.upsert({
    where: { name: "OfficeManager" },
    update: {},
    create: { name: "OfficeManager" },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: "Staff" },
    update: {},
    create: { name: "Staff" },
  });

  console.log("Roles created:", { adminRole, officeManagerRole, staffRole });

  // Create admin user
  const passwordHash = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      email: "admin@example.com",
    },
    create: {
      username: "admin",
      passwordHash,
      displayName: "管理者",
      email: "admin@example.com",
      roleId: adminRole.id,
    },
  });

  console.log("Admin user created:", adminUser);

  // Create default memorial rule
  const defaultRule = await prisma.memorialRule.upsert({
    where: { id: "default-rule" },
    update: {},
    create: {
      id: "default-rule",
      name: "標準年忌",
      yearsJson: [1, 3, 7, 13, 17, 23, 27, 33, 50],
      isDefault: true,
    },
  });

  console.log("Default memorial rule created:", defaultRule);

  // Create sample data for development
  const sampleHousehold = await prisma.household.upsert({
    where: { id: "sample-household-1" },
    update: {},
    create: {
      id: "sample-household-1",
      name: "山田家",
      postalCode: "100-0001",
      prefecture: "東京都",
      city: "千代田区",
      addressLine1: "千代田1-1-1",
      phoneNumber: "03-1234-5678",
      contactPriority: "postal",
      status: "active",
    },
  });

  const sampleHousehold2 = await prisma.household.upsert({
    where: { id: "sample-household-2" },
    update: {},
    create: {
      id: "sample-household-2",
      name: "鈴木家",
      postalCode: "150-0001",
      prefecture: "東京都",
      city: "渋谷区",
      addressLine1: "神宮前2-2-2",
      phoneNumber: "03-9876-5432",
      email: "suzuki@example.com",
      contactPriority: "email",
      status: "active",
    },
  });

  console.log("Sample households created:", { sampleHousehold, sampleHousehold2 });

  // Create sample deceased
  const sampleDeceased = await prisma.deceased.upsert({
    where: { id: "sample-deceased-1" },
    update: {},
    create: {
      id: "sample-deceased-1",
      householdId: sampleHousehold.id,
      lastName: "山田",
      firstName: "太郎",
      posthumousName: "釋淨光居士",
      deathDate: new Date("2024-06-15"),
    },
  });

  const sampleDeceased2 = await prisma.deceased.upsert({
    where: { id: "sample-deceased-2" },
    update: {},
    create: {
      id: "sample-deceased-2",
      householdId: sampleHousehold2.id,
      lastName: "鈴木",
      firstName: "花子",
      posthumousName: "釋妙蓮信女",
      deathDate: new Date("2025-03-10"),
    },
  });

  console.log("Sample deceased created:", { sampleDeceased, sampleDeceased2 });

  // Generate memorial instances for all deceased
  const rule = await prisma.memorialRule.findFirst({ where: { isDefault: true } });
  if (rule) {
    const years = rule.yearsJson as number[];
    const now = new Date();
    const twelveMonthsLater = new Date(now);
    twelveMonthsLater.setMonth(twelveMonthsLater.getMonth() + 12);

    for (const deceased of [sampleDeceased, sampleDeceased2]) {
      const deathDate = new Date(deceased.deathDate);
      for (const year of years) {
        const dueDate = new Date(deathDate);
        dueDate.setFullYear(dueDate.getFullYear() + year);

        if (dueDate >= now && dueDate <= twelveMonthsLater) {
          await prisma.memorialInstance.upsert({
            where: {
              deceasedId_year: {
                deceasedId: deceased.id,
                year,
              },
            },
            update: { dueDate },
            create: {
              deceasedId: deceased.id,
              memorialRuleId: rule.id,
              year,
              dueDate,
            },
          });
          console.log(`Memorial: ${deceased.lastName}${deceased.firstName} ${year}回忌 (${dueDate.toISOString().split("T")[0]})`);
        }
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
