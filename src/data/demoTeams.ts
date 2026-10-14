export interface DemoTeamDef {
  teamCode: string; // e.g. BULLS-101
  name: string;
  accessCode: string; // Plaintext code used for initial seed / login
  startingBalance: number;
}

export const DEMO_TEAMS: DemoTeamDef[] = [
  {
    teamCode: "BULLS-101",
    name: "Apex Predators",
    accessCode: "BULLS-101",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-102",
    name: "Wall Street Wolves",
    accessCode: "BULLS-102",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-103",
    name: "Quantum Bulls",
    accessCode: "BULLS-103",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-104",
    name: "Silicon Mavericks",
    accessCode: "BULLS-104",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-105",
    name: "Galactic Capital",
    accessCode: "BULLS-105",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-106",
    name: "Cyber Strikers",
    accessCode: "BULLS-106",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-107",
    name: "Alpha Centauri",
    accessCode: "BULLS-107",
    startingBalance: 5000,
  },
  {
    teamCode: "BULLS-108",
    name: "Golden Horns",
    accessCode: "BULLS-108",
    startingBalance: 5000,
  },
];
