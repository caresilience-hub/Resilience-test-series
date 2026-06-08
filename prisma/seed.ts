import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@resillience.in";

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: UserRole.ADMIN,
      firstName: "Resillience",
      surname: "Admin",
      mobile: null
    },
    create: {
      email: adminEmail,
      role: UserRole.ADMIN,
      firstName: "Resillience",
      surname: "Admin",
      mobile: null
    }
  });

  console.log(`Seeded permanent admin account: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
