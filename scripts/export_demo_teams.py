import json
from generate_credentials_pdf import parse_csv_data

teams = parse_csv_data()

lines = []
lines.append('export interface DemoTeamDef {')
lines.append('  teamCode: string; // Unstop Team ID or unique squad code')
lines.append('  name: string;')
lines.append('  members: string[]; // Participant names (1 solo, 2, or 3+)')
lines.append('  accessCode: string; // Plaintext code used for initial seed / login')
lines.append('  startingBalance: number;')
lines.append('}\n')
lines.append('export const DEMO_TEAMS: DemoTeamDef[] = [')

for t in teams:
    team_code = t["team_id"]
    name = t["display_name"].replace('"', '\\"')
    members_json = json.dumps(t["members"], ensure_ascii=False)
    pwd = t["password"]
    lines.append('  {')
    lines.append(f'    teamCode: "{team_code}",')
    lines.append(f'    name: "{name}",')
    lines.append(f'    members: {members_json},')
    lines.append(f'    accessCode: "{pwd}",')
    lines.append('    startingBalance: 5000,')
    lines.append('  },')

benchmark_squads = [
    {
        "teamCode": "BULLS-101",
        "name": "Apex Predators",
        "members": ["Aarav Sharma", "Rohan Mehta", "Priya Nair"],
        "accessCode": "BULLS-101",
        "startingBalance": 5000,
    },
    {
        "teamCode": "BULLS-102",
        "name": "Wall Street Wolves",
        "members": ["Kabir Das", "Ishaan Malhotra"],
        "accessCode": "BULLS-102",
        "startingBalance": 5000,
    },
    {
        "teamCode": "BULLS-103",
        "name": "Quantum Bulls",
        "members": ["Vikramaditya Rao"],
        "accessCode": "BULLS-103",
        "startingBalance": 5000,
    },
    {
        "teamCode": "BULLS-104",
        "name": "Silicon Mavericks",
        "members": ["Ananya Iyer", "Neha Gupta", "Tanmay Joshi"],
        "accessCode": "BULLS-104",
        "startingBalance": 5000,
    },
    {
        "teamCode": "BULLS-105",
        "name": "Galactic Capital",
        "members": ["Siddharth Sen", "Diya Mukherjee"],
        "accessCode": "BULLS-105",
        "startingBalance": 5000,
    },
    {
        "teamCode": "BULLS-106",
        "name": "Cyber Strikers",
        "members": ["Aditya Kulkarni"],
        "accessCode": "BULLS-106",
        "startingBalance": 5000,
    },
    {
        "teamCode": "BULLS-107",
        "name": "Alpha Centauri",
        "members": ["Meera Kapoor", "Tara Pillai", "Arjun Reddy"],
        "accessCode": "BULLS-107",
        "startingBalance": 5000,
    },
    {
        "teamCode": "BULLS-108",
        "name": "Golden Horns",
        "members": ["Rahul Varma", "Simran Gill"],
        "accessCode": "BULLS-108",
        "startingBalance": 5000,
    },
]

for b in benchmark_squads:
    lines.append('  {')
    lines.append(f'    teamCode: "{b["teamCode"]}",')
    lines.append(f'    name: "{b["name"]}",')
    lines.append(f'    members: {json.dumps(b["members"])},')
    lines.append(f'    accessCode: "{b["accessCode"]}",')
    lines.append('    startingBalance: 5000,')
    lines.append('  },')

lines.append('];\n')

content = '\n'.join(lines)
with open("src/data/demoTeams.ts", "w", encoding="utf-8") as f:
    f.write(content)

print(f"Successfully wrote {len(teams)} teams to src/data/demoTeams.ts")
