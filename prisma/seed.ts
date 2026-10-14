// THE BIG BULL - Prisma Database Seeding Script
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_TEAMS } from "../src/data/demoTeams";
import { DEMO_QUESTIONS } from "../src/data/demoQuestions";

const prisma = new PrismaClient();

async function main() {
  console.log("🐂 Seeding THE BIG BULL Database...");

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "bigbull2026";
  const adminHash = bcrypt.hashSync(adminPassword, 10);

  // 1. Admin
  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: { passwordHash: adminHash },
    create: {
      username: adminUsername,
      passwordHash: adminHash,
      name: "Chief Administrator",
    },
  });
  console.log(`✅ Admin seeded (${adminUsername})`);

  // 2. Demo Teams
  for (const t of DEMO_TEAMS) {
    const hash = bcrypt.hashSync(t.accessCode, 10);
    await prisma.team.upsert({
      where: { teamCode: t.teamCode },
      update: {
        name: t.name,
        accessCodeHash: hash,
        startingBalance: t.startingBalance,
      },
      create: {
        teamCode: t.teamCode,
        name: t.name,
        accessCodeHash: hash,
        startingBalance: t.startingBalance,
        currentBalance: t.startingBalance,
      },
    });
  }
  console.log(`✅ ${DEMO_TEAMS.length} Demo Teams seeded`);

  // 3. Demo Questions
  for (const q of DEMO_QUESTIONS) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {
        text: q.text,
        category: q.category,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        imageUrl: q.imageUrl || null,
        visualClueUrl: q.visualClueUrl || null,
        hintText: q.hintText || null,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        durationSeconds: q.durationSeconds,
      },
      create: {
        id: q.id,
        text: q.text,
        category: q.category,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption,
        imageUrl: q.imageUrl || null,
        visualClueUrl: q.visualClueUrl || null,
        hintText: q.hintText || null,
        explanation: q.explanation || null,
        difficulty: q.difficulty,
        durationSeconds: q.durationSeconds,
      },
    });
  }
  console.log(`✅ ${DEMO_QUESTIONS.length} Demo Questions seeded`);

  // 4. Sample Championship Game
  const game = await prisma.game.create({
    data: {
      title: "THE BIG BULL Championship 2026",
      status: "LOBBY",
      currentQuestionIndex: 0,
      defaultQuestionDuration: 300,
    },
  });

  const allQuestions = await prisma.question.findMany({ where: { isActive: true } });
  for (let i = 0; i < allQuestions.length; i++) {
    await prisma.gameQuestion.create({
      data: {
        gameId: game.id,
        questionId: allQuestions[i].id,
        orderIndex: i,
        durationSeconds: allQuestions[i].durationSeconds,
      },
    });
  }
  console.log(`✅ Sample Championship Game created with ${allQuestions.length} rounds`);

  console.log("🐂 Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
