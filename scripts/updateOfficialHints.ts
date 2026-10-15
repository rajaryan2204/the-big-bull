import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

export const OFFICIAL_HINTS: Record<number, string> = {
  1: "Look for the planet with the slowest rotation on its axis.",
  2: "Nitrogen is relatively unreactive and helps protect oils from oxidation.",
  3: "At ordinary room temperature, mercury is liquid; gallium melts just above typical room temperature.",
  4: "Compare thermal conductivity: which metal carries heat away from your hand faster?",
  5: "Think about how much of the Moon's sunlit half is visible from Earth.",
  6: "Heating raises the average kinetic energy of its particles.",
  7: "A thin chromium oxide film protects the surface.",
  8: "Voltage can rise while current falls; energy is not created.",
  9: "Gravity keeps pulling it inward while sideways motion keeps it in orbit.",
  10: "Each pH unit means a tenfold change in hydrogen-ion concentration.",
  11: "Venus's dense atmosphere traps heat through the greenhouse effect.",
  12: "Without air resistance, objects fall with the same gravitational acceleration.",
  13: "It provides a lower-activation-energy route and is regenerated.",
  14: "High refractive index helps create strong refraction and total internal reflection.",
  15: "There is normally very little voltage difference between its feet.",
  16: "Look at the redshift observed in light from distant galaxies.",
  17: "A closer circular orbit has a higher orbital speed and a shorter period.",
  18: "A substance that reacts with both acids and bases is called amphoteric.",
  19: "Extra nutrients can cause algal blooms; decomposition then uses up dissolved oxygen.",
  20: "A microcontroller commonly combines CPU, memory and peripherals on one chip.",
  21: "Air molecules scatter shorter visible wavelengths more strongly.",
  22: "Fusion joins light nuclei; fission splits heavy nuclei.",
  23: "Steady DC does not create continuously changing magnetic flux.",
  24: "For a given wavelength and conditions, higher refractive index means lower light speed in the material.",
  25: "Ozone molecules absorb particular ultraviolet wavelengths strongly.",
  26: "The dark centre is a shadow caused by light capture and gravitational bending.",
  27: "Metal usually transfers heat away from skin faster than wood.",
  28: "Salt lowers water's freezing point; melting can absorb heat from the surroundings.",
  29: "Fusion releases energy because the products have lower total mass-energy than the starting particles.",
  30: "Longer observed wavelengths are redshifted, consistent with cosmic expansion.",
  31: "The protective coating metal is commonly used to prevent rusting.",
  32: "Higher pressure raises water's boiling point.",
  33: "The gas is dissolved under pressure and escapes as bubbles when opened.",
  34: "The coloured part of the eye adjusts the pupil opening.",
  35: "Find the planet that rotates almost on its side.",
  36: "Choose a magnetic material that magnetises and demagnetises easily.",
  37: "Think of the gas that makes up about 78% of dry air.",
  38: "The Moon's orbit is tilted, so the Sun, Moon and Earth usually do not line up exactly.",
  39: "This device uses electric current to produce rotation or motion.",
  40: "This widely used element is the basis of many electronic chips."
};

async function main() {
  console.log("Updating official hints in demoQuestions.ts...");
  const demoPath = path.join(__dirname, "../src/data/demoQuestions.ts");
  let demoContent = fs.readFileSync(demoPath, "utf8");

  // Load demo questions module
  const { DEMO_QUESTIONS } = await import("../src/data/demoQuestions");
  
  for (const q of DEMO_QUESTIONS) {
    const order = q.order || Number(q.id.replace("q-", ""));
    const newHint = OFFICIAL_HINTS[order];
    if (newHint) {
      q.hintText = newHint;
    }
  }

  // Rewrite demoQuestions.ts with updated questions
  const newDemoContent = `// THE BIG BULL - 40 Official Championship Competition Questions
export interface DemoQuestionDef {
  id: string;
  order?: number;
  text: string;
  category: "General Knowledge" | "Space" | "Basic Technical Concepts" | "Science and Technology" | "Logical Thinking";
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  imageUrl?: string;
  visualClueUrl?: string;
  hintText: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  durationSeconds: number;
}

export const DEMO_QUESTIONS: DemoQuestionDef[] = ${JSON.stringify(DEMO_QUESTIONS, null, 2)};
`;
  fs.writeFileSync(demoPath, newDemoContent, "utf8");
  console.log("✅ demoQuestions.ts updated with official hints!");

  // Update seed50Questions.ts
  console.log("Updating official hints in seed50Questions.ts...");
  const seedPath = path.join(__dirname, "./seed50Questions.ts");
  let seedContent = fs.readFileSync(seedPath, "utf8");
  for (let order = 1; order <= 40; order++) {
    const hint = OFFICIAL_HINTS[order];
    const id = `q-${String(order).padStart(2, "0")}`;
    // Replace hintText in seed questions data
    // Find pattern: id: "q-01", ... hintText: "..."
  }

  // Update Neon PostgreSQL DB directly
  console.log("Connecting to Neon PostgreSQL via Prisma to update hints...");
  const prisma = new PrismaClient();
  try {
    for (let order = 1; order <= 40; order++) {
      const hint = OFFICIAL_HINTS[order];
      const id = `q-${String(order).padStart(2, "0")}`;
      await prisma.question.update({
        where: { id },
        data: { hintText: hint }
      }).catch((err) => {
        console.warn(`Could not update question ${id} in DB:`, err.message);
      });
    }
    console.log("✅ Neon PostgreSQL DB updated with all 40 official hints!");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
