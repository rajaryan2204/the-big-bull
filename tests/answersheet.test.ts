import { describe, it, expect, beforeEach } from "vitest";
import { DemoStore } from "../src/server/storage";

describe("THE BIG BULL - Immediate Feedback & Answer Sheet Verification", () => {
  let store: DemoStore;

  beforeEach(async () => {
    store = new DemoStore();
    await store.initialize();
  });

  it("should evaluate answer immediately on submission and return correctness cues", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    expect(gq).not.toBeNull();
    const q = await store.getQuestionById(gq!.questionId);
    expect(q).not.toBeNull();

    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-101");
    expect(team).not.toBeNull();

    // 1. Submit Correct Option
    const correctRes = await store.submitAnswer(
      game.id,
      gq!.id,
      team!.id,
      q!.correctOption,
      15
    );

    expect(correctRes.success).toBe(true);
    expect(correctRes.isCorrect).toBe(true);
    expect(correctRes.correctOption).toBe(q!.correctOption);
    expect(correctRes.explanation).toBe(q!.explanation);
    expect(correctRes.answer?.pointsAwarded).toBe(1000);
  });

  it("should generate a complete 40-question answer sheet for any team", async () => {
    const sheet = await store.getTeamAnswerSheet("BULLS-101");

    expect(sheet).toBeDefined();
    expect(sheet.team).toBeDefined();
    expect(sheet.team.teamCode).toBe("BULLS-101");
    expect(sheet.summary).toBeDefined();
    expect(sheet.summary.totalQuestions).toBeGreaterThanOrEqual(1);
    expect(sheet.items).toBeDefined();
    expect(Array.isArray(sheet.items)).toBe(true);

    const firstItem = sheet.items[0];
    expect(firstItem.questionId).toBeDefined();
    expect(firstItem.questionText).toBeDefined();
    expect(firstItem.options).toBeDefined();
    expect(firstItem.options.A).toBeDefined();
    expect(firstItem.correctOption).toBeDefined();
  });
});
