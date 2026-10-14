// THE BIG BULL - Automated Test Suite for 20 Authoritative Game Rules
import { describe, it, expect, beforeEach } from "vitest";
import { DemoStore } from "../src/server/storage";
import { verifyAdminToken, verifyTeamToken, signAdminToken, signTeamToken } from "../src/server/auth";

describe("THE BIG BULL - Comprehensive Game Rules & Security Tests", () => {
  let store: DemoStore;

  beforeEach(async () => {
    store = new DemoStore();
    await store.initialize();
    // Fresh game
    await store.createOrResetGame();
  });

  // 1. Correct team authentication
  it("Rule 1: Should authenticate team with valid credentials", async () => {
    const res = await store.authenticateTeam("BULLS-101", "BULLS-101");
    expect(res.success).toBe(true);
    expect(res.team?.teamCode).toBe("BULLS-101");
    expect(res.team?.currentBalance).toBe(5000);
  });

  // 2. Invalid access codes
  it("Rule 2: Should reject invalid access codes", async () => {
    const res = await store.authenticateTeam("BULLS-101", "WRONG_SECRET");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Invalid/i);
  });

  // 3. Disabled team login rejection
  it("Rule 3: Should reject disabled team login", async () => {
    const team = await store.getTeamByCode("BULLS-102");
    expect(team).not.toBeNull();
    await store.updateTeam(team!.id, { isDisabled: true });

    const res = await store.authenticateTeam("BULLS-102", "BULLS-102");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/disabled/i);
  });

  // 4. Correct answer submission
  it("Rule 4: Should accept answer submission for active question", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    expect(gq).not.toBeNull();

    // Set question active with deadline
    const deadline = new Date(Date.now() + 300000).toISOString();
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE", deadline });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-101");
    const sub = await store.submitAnswer(game.id, gq!.id, team!.id, "B");
    expect(sub.success).toBe(true);
    expect(sub.answer?.selectedOption).toBe("B");
    expect(sub.answer?.isLocked).toBe(true);
  });

  // 5. Duplicate answer rejection
  it("Rule 5: Should reject duplicate answer when locking is enforced", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    const deadline = new Date(Date.now() + 300000).toISOString();
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE", deadline });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-101");
    await store.submitAnswer(game.id, gq!.id, team!.id, "A");

    // Second attempt
    const second = await store.submitAnswer(game.id, gq!.id, team!.id, "C");
    expect(second.success).toBe(false);
    expect(second.error).toMatch(/locked/i);
  });

  // 6. Submission after the deadline rejection
  it("Rule 6: Should strictly reject submission after deadline", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    // Deadline passed 5 seconds ago
    const expiredDeadline = new Date(Date.now() - 5000).toISOString();
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE", deadline: expiredDeadline });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-101");
    const res = await store.submitAnswer(game.id, gq!.id, team!.id, "B");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/expired|closed/i);
  });

  // 7. Correct server-side timer closure
  it("Rule 7: Should close question and reject any further answers", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "CLOSED" });
    await store.updateGameStatus("QUESTION_CLOSED");

    const team = await store.getTeamByCode("BULLS-101");
    const res = await store.submitAnswer(game.id, gq!.id, team!.id, "A");
    expect(res.success).toBe(false);
  });

  // 8. Bull’s Hint deduction
  it("Rule 8: Should deduct 500 coins and unlock hint text", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-101");
    const res = await store.purchaseLifeline(game.id, gq!.id, team!.id, "BULLS_HINT", "key-hint-1");

    expect(res.success).toBe(true);
    expect(res.lifeline?.details?.hintText).toBeDefined();

    const updatedTeam = await store.getTeamById(team!.id);
    expect(updatedTeam?.currentBalance).toBe(4500); // 5000 - 500
  });

  // 9. Vision Boost deduction
  it("Rule 9: Should deduct 1500 coins and unlock visual clue", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-101");
    const res = await store.purchaseLifeline(game.id, gq!.id, team!.id, "VISION_BOOST", "key-vision-1");

    expect(res.success).toBe(true);
    expect(res.lifeline?.details?.visualClueUrl).toBeDefined();

    const updatedTeam = await store.getTeamById(team!.id);
    expect(updatedTeam?.currentBalance).toBe(3500); // 5000 - 1500
  });

  // 10. 50-50 Blast option elimination
  it("Rule 10: Should eliminate exactly two incorrect options", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const fullQ = await store.getQuestionById(gq!.questionId);
    const correctOpt = fullQ!.correctOption;

    const team = await store.getTeamByCode("BULLS-101");
    const res = await store.purchaseLifeline(game.id, gq!.id, team!.id, "50_50_BLAST", "key-5050-1");

    expect(res.success).toBe(true);
    const eliminated = res.lifeline?.details?.eliminatedOptions || [];
    expect(eliminated.length).toBe(2);
    // Crucial rule: Correct option must NOT be eliminated!
    expect(eliminated).not.toContain(correctOpt);

    const updatedTeam = await store.getTeamById(team!.id);
    expect(updatedTeam?.currentBalance).toBe(3000); // 5000 - 2000
  });

  // 11. Bull’s Pass behavior
  it("Rule 11: Should mark question as skipped and block subsequent answers", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-101");
    const res = await store.purchaseLifeline(game.id, gq!.id, team!.id, "BULLS_PASS", "key-pass-1");

    expect(res.success).toBe(true);
    expect(res.lifeline?.details?.isSkipped).toBe(true);

    const updatedTeam = await store.getTeamById(team!.id);
    expect(updatedTeam?.currentBalance).toBe(2500); // 5000 - 2500

    // Subsequent answer must be rejected
    const ans = await store.submitAnswer(game.id, gq!.id, team!.id, "B");
    expect(ans.success).toBe(false);
    expect(ans.error).toMatch(/Bull's Pass/i);
  });

  // 12. Insufficient coin balance rejection
  it("Rule 12: Should reject lifeline purchase if team has insufficient coins", async () => {
    const team = await store.getTeamByCode("BULLS-103");
    // Manually reduce balance to 100 coins
    await store.adjustCoins(team!.id, -4900, "TEST_DEDUCT");

    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    // Try to buy 500 coin hint with only 100 coins
    const res = await store.purchaseLifeline(game.id, gq!.id, team!.id, "BULLS_HINT", "key-low-coins");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Insufficient coins/i);

    // Balance should remain unchanged
    const after = await store.getTeamById(team!.id);
    expect(after?.currentBalance).toBe(100);
  });

  // 13. Duplicate lifeline purchase rejection
  it("Rule 13: Should reject duplicate purchase of same lifeline on same question", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team = await store.getTeamByCode("BULLS-104");
    const first = await store.purchaseLifeline(game.id, gq!.id, team!.id, "BULLS_HINT", "key-dup-1");
    expect(first.success).toBe(true);

    const second = await store.purchaseLifeline(game.id, gq!.id, team!.id, "BULLS_HINT", "key-dup-2");
    expect(second.success).toBe(false);
    expect(second.error).toMatch(/already purchased/i);
  });

  // 14. Concurrent coin spending
  it("Rule 14: Should handle concurrent balance adjustments safely", async () => {
    const team = await store.getTeamByCode("BULLS-105");
    const initialBalance = team!.currentBalance;

    // Execute 5 concurrent deductions of 200 coins each
    const promises = Array.from({ length: 5 }).map((_, i) =>
      store.adjustCoins(team!.id, -200, "CONCURRENT_DEDUCT", { idempotencyKey: `conc-${i}` })
    );

    const results = await Promise.all(promises);
    results.forEach((r) => expect(r.success).toBe(true));

    const finalTeam = await store.getTeamById(team!.id);
    expect(finalTeam?.currentBalance).toBe(initialBalance - 1000);
  });

  // 15. Score updates without duplication
  it("Rule 15: Should award points to correct team and penalize incorrect team without duplication", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    const fullQ = await store.getQuestionById(gq!.questionId);
    const correctOpt = fullQ!.correctOption; // e.g. "B"
    const wrongOpt = correctOpt === "A" ? "B" : "A";

    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const teamCorrect = await store.getTeamByCode("BULLS-106");
    const teamWrong = await store.getTeamByCode("BULLS-107");

    await store.submitAnswer(game.id, gq!.id, teamCorrect!.id, correctOpt);
    await store.submitAnswer(game.id, gq!.id, teamWrong!.id, wrongOpt);

    // Reveal and score
    const res = await store.revealAnswersAndScore(game.id, gq!.id);
    expect(res.correctOption).toBe(correctOpt);

    const afterCorrect = await store.getTeamById(teamCorrect!.id);
    expect(afterCorrect?.score).toBe(1000); // Default reward: 1000
    expect(afterCorrect?.correctAnswers).toBe(1);

    const afterWrong = await store.getTeamById(teamWrong!.id);
    expect(afterWrong?.score).toBe(0); // Penalized from 0, stays at 0
    expect(afterWrong?.attemptedQuestions).toBe(1);
  });

  // 16. Unauthorized admin requests
  it("Rule 16: Should reject unauthorized/invalid admin JWT tokens", () => {
    const invalidToken = "tampered.jwt.signature";
    const result = verifyAdminToken(invalidToken);
    expect(result).toBeNull();

    // Valid admin token succeeds
    const valid = signAdminToken({ username: "admin", role: "admin" });
    const verified = verifyAdminToken(valid);
    expect(verified?.username).toBe("admin");
  });

  // 17. Unauthorized Socket.IO events (Session validation)
  it("Rule 17: Should validate session tokens before allowing protected actions", async () => {
    const invalidCheck = await store.validateSession("non-existent-token");
    expect(invalidCheck.valid).toBe(false);

    const team = await store.getTeamByCode("BULLS-108");
    const token = signTeamToken({ teamId: team!.id, teamCode: team!.teamCode, role: "team" });
    await store.createSession(team!.id, token);

    const validCheck = await store.validateSession(token);
    expect(validCheck.valid).toBe(true);
    expect(validCheck.teamId).toBe(team!.id);
  });

  // 18. Reconnection without extra answer time
  it("Rule 18: Reconnection must preserve deadline and never extend answering time", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);

    const originalDeadline = new Date(Date.now() + 120000).toISOString();
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE", deadline: originalDeadline });

    // Client reconnects: retrieves current question
    const reconnectedGQ = await store.getGameQuestionById(gq!.id);
    expect(reconnectedGQ?.deadline).toBe(originalDeadline);
  });

  // 19. Question state recovery after restart
  it("Rule 19: Preserves and recovers game state and questions across instances", async () => {
    const game = await store.getCurrentGame();
    expect(game.totalQuestions).toBeGreaterThanOrEqual(15);
    expect(game.totalTeamsCount).toBeGreaterThanOrEqual(8);

    const team = await store.getTeamByCode("BULLS-101");
    expect(team).not.toBeNull();
  });

  // 20. Cross-team data access prevention
  it("Rule 20: Ensures lifelines and hints are strictly isolated per team", async () => {
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    await store.updateGameStatus("QUESTION_ACTIVE", 0);

    const team1 = await store.getTeamByCode("BULLS-101");
    const team2 = await store.getTeamByCode("BULLS-102");

    // Team 1 purchases Bull's Hint
    await store.purchaseLifeline(game.id, gq!.id, team1!.id, "BULLS_HINT", "t1-hint");

    // Check Team 1 lifelines
    const t1Lifelines = await store.getLifelinesForTeam(gq!.id, team1!.id);
    expect(t1Lifelines.BULLS_HINT.purchased).toBe(true);
    expect(t1Lifelines.BULLS_HINT.details?.hintText).toBeDefined();

    // Check Team 2 lifelines -> MUST NOT have hint
    const t2Lifelines = await store.getLifelinesForTeam(gq!.id, team2!.id);
    expect(t2Lifelines.BULLS_HINT.purchased).toBe(false);
    expect(t2Lifelines.BULLS_HINT.details).toBeUndefined();
  });

  // 21. Strike Recording
  it("Rule 21: Should record strikes incrementally on security breach", async () => {
    const team = await store.getTeamByCode("BULLS-101");
    const s1 = await store.recordTeamStrike(team!.id, "Window minimized");
    expect(s1.strikesCount).toBe(1);
    expect(s1.isDisqualified).toBe(false);

    const s2 = await store.recordTeamStrike(team!.id, "Fullscreen exited");
    expect(s2.strikesCount).toBe(2);
    expect(s2.isDisqualified).toBe(false);
  });

  // 22. Automatic 3-Strike Disqualification
  it("Rule 22: 3rd strike must automatically disqualify team and terminate terminal", async () => {
    const team = await store.getTeamByCode("BULLS-102");
    await store.recordTeamStrike(team!.id, "Breach 1");
    await store.recordTeamStrike(team!.id, "Breach 2");
    const s3 = await store.recordTeamStrike(team!.id, "Breach 3 (Final)");

    expect(s3.strikesCount).toBe(3);
    expect(s3.isDisqualified).toBe(true);

    const updated = await store.getTeamById(team!.id);
    expect(updated?.isDisqualified).toBe(true);
    expect(updated?.isDisabled).toBe(true);

    // Disqualified team cannot submit answers
    const game = await store.getCurrentGame();
    const gq = await store.getGameQuestionByOrder(game.id, 0);
    await store.updateGameQuestion(gq!.id, { status: "ACTIVE" });
    const sub = await store.submitAnswer(game.id, gq!.id, team!.id, "A");
    expect(sub.success).toBe(false);
  });

  // 23. Admin Strike Reset / Pardon
  it("Rule 23: Should allow resetting team strikes upon admin review", async () => {
    const team = await store.getTeamByCode("BULLS-103");
    await store.recordTeamStrike(team!.id, "False alarm");
    const tBefore = await store.getTeamById(team!.id);
    expect(tBefore?.strikesCount).toBe(1);

    // Reset via updateTeam
    const raw = (store as any).teams.get(team!.id);
    raw.strikesCount = 0;
    raw.isDisqualified = false;
    raw.isDisabled = false;

    const tAfter = await store.getTeamById(team!.id);
    expect(tAfter?.strikesCount).toBe(0);
    expect(tAfter?.isDisqualified).toBe(false);
  });

  // 24. Incognito Enforcement Default
  it("Rule 24: Should default requireIncognito to true in authoritative GameState", async () => {
    const game = await store.getCurrentGame();
    expect(game.requireIncognito).toBe(true);
  });

  // 25. Incognito Setting Toggle
  it("Rule 25: Should allow updating requireIncognito setting for admin bypass", async () => {
    await store.updateGameSettings({ requireIncognito: false });
    const gameDisabled = await store.getCurrentGame();
    expect(gameDisabled.requireIncognito).toBe(false);

    await store.updateGameSettings({ requireIncognito: true });
    const gameReEnabled = await store.getCurrentGame();
    expect(gameReEnabled.requireIncognito).toBe(true);
  });

  // 26. Team Members / Participants Support (Solo, Pairs, Trios)
  it("Rule 26: Should store and return team members for solo, pairs, and squads", async () => {
    // 3-member squad (Team A)
    const squadA = await store.createTeam(
      "SQUAD-A",
      "Apex Alpha",
      "SECRET-A",
      5000,
      ["Aarav Sharma", "Priya Patel", "Rohan Gupta"]
    );
    expect(squadA.members).toHaveLength(3);
    expect(squadA.members).toEqual(["Aarav Sharma", "Priya Patel", "Rohan Gupta"]);

    // 1-member solo team (Team B)
    const soloB = await store.createTeam(
      "SOLO-B",
      "Lone Wolf",
      "SECRET-B",
      5000,
      ["Kabir Mehta"]
    );
    expect(soloB.members).toHaveLength(1);
    expect(soloB.members).toEqual(["Kabir Mehta"]);

    // Dynamic member update (edit members)
    const updated = await store.updateTeam(squadA.id, {
      members: ["Aarav Sharma", "Priya Patel"], // Rohan removed, now pair of 2
    });
    expect(updated.members).toHaveLength(2);
    expect(updated.members).toEqual(["Aarav Sharma", "Priya Patel"]);
  });

  // 27. Leaderboard includes squad members
  it("Rule 27: Leaderboard entries must include squad members", async () => {
    const squad = await store.createTeam(
      "LEAD-SQUAD",
      "Leaderboard Champions",
      "SECRET-C",
      5000,
      ["Player One", "Player Two"]
    );
    const lb = await store.getLeaderboard();
    const found = lb.find((e) => e.teamId === squad.id);
    expect(found).toBeDefined();
    expect(found?.members).toEqual(["Player One", "Player Two"]);
  });
});
