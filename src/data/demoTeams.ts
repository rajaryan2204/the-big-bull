export interface DemoTeamDef {
  teamCode: string; // e.g. BULLS-101
  name: string;
  members: string[]; // Participant names (1 solo, 2, or 3+)
  accessCode: string; // Plaintext code used for initial seed / login
  startingBalance: number;
}

export const DEMO_TEAMS: DemoTeamDef[] = [
  {
    teamCode: "BULLS-101",
    name: "Apex Predators",
    members: ["Aarav Sharma", "Rohan Mehta", "Priya Nair"],
    accessCode: "BULLS-101",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-102",
    name: "Wall Street Wolves",
    members: ["Kabir Das", "Ishaan Malhotra"],
    accessCode: "BULLS-102",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-103",
    name: "Quantum Bulls",
    members: ["Vikramaditya Rao"], // Solo participant
    accessCode: "BULLS-103",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-104",
    name: "Silicon Mavericks",
    members: ["Ananya Iyer", "Neha Gupta", "Tanmay Joshi"],
    accessCode: "BULLS-104",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-105",
    name: "Galactic Capital",
    members: ["Siddharth Sen", "Diya Mukherjee"],
    accessCode: "BULLS-105",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-106",
    name: "Cyber Strikers",
    members: ["Aditya Kulkarni"], // Solo participant
    accessCode: "BULLS-106",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-107",
    name: "Alpha Centauri",
    members: ["Meera Kapoor", "Tara Pillai", "Arjun Reddy"],
    accessCode: "BULLS-107",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-108",
    name: "Golden Horns",
    members: ["Rahul Varma", "Simran Gill"],
    accessCode: "BULLS-108",
    startingBalance: 5000,
  },
];
