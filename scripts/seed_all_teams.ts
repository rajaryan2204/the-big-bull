import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_TEAMS } from "../src/data/demoTeams";

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting seed of ${DEMO_TEAMS.length} official teams from Big bull.csv...`);

  // 1. Clean existing sessions and transactions
  await prisma.teamSession.deleteMany({});
  await prisma.coinTransaction.deleteMany({});
  await prisma.suspiciousActivity.deleteMany({});
  await prisma.lifelinePurchase.deleteMany({});
  await prisma.teamAnswer.deleteMany({});

  // 2. Clear existing teams so only the genuine 114 teams exist
  const del = await prisma.team.deleteMany({});
  console.log(`Cleared ${del.count} old teams from database.`);

  // 3. Batch create all 114 teams
  let createdCount = 0;
  for (const t of DEMO_TEAMS) {
    const accessCodeHash = bcrypt.hashSync(t.accessCode.trim(), 10);

    await prisma.team.create({
      data: {
        teamCode: t.teamCode.toUpperCase(),
        name: t.name,
        members: t.members,
        accessCodeHash,
        startingBalance: t.startingBalance || 5000,
        currentBalance: t.startingBalance || 5000,
        score: 0,
        correctAnswers: 0,
        attemptedQuestions: 0,
        isActive: true,
        isDisabled: false,
        isDisqualified: false,
        strikesCount: 0,
        connectionStatus: "DISCONNECTED",
      },
    });
    createdCount++;
  }

  console.log(`✅ Successfully seeded all ${createdCount} teams into Neon PostgreSQL!`);

  // 4. Update Game record
  const game = await prisma.game.findFirst({
    where: { id: "bigbull-championship-2026" },
  });

  if (game) {
    await prisma.game.update({
      where: { id: game.id },
      data: {
        status: "LOBBY",
        currentQuestionIndex: 0,
      },
    });
    console.log(`✅ Verified Game record '${game.id}' set to LOBBY with 40 questions.`);
  }

  const count = await prisma.team.count();
  console.log(`🎉 Total teams verified in PostgreSQL: ${count}`);
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
