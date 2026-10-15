import csv
import re
import json

path = "/Users/rajaryan/Downloads/Big bull.csv"
with open(path, "r", encoding="utf-8", errors="ignore") as f:
    rows = list(csv.DictReader(f))

teams = {}
for r in rows:
    tid = r.get("Team ID", "").strip()
    if not tid:
        continue
    tname = r.get("Team Name", "").strip()
    cname = r.get("Candidate's Name", "").strip()
    role = r.get("Candidate role", "").strip()
    mobile = r.get("Candidate's Mobile", "").strip()
    email = r.get("Candidate's Email", "").strip()
    college = r.get("Candidate's Organisation", "").strip()
    pay_status = r.get("Payment Status", "").strip()
    reg_status = r.get("Reg. Status", "").strip()

    digits = re.sub(r"\D", "", mobile)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]

    if tid not in teams:
        teams[tid] = {
            "team_id": tid,
            "raw_name": tname,
            "name": tname,
            "leader_name": "",
            "leader_mobile": "",
            "leader_email": "",
            "college": college,
            "members": [],
            "pay_status": pay_status,
            "reg_status": reg_status
        }
    
    if role == "Team Leader" or not teams[tid]["leader_name"]:
        teams[tid]["leader_name"] = cname
        teams[tid]["leader_mobile"] = digits
        teams[tid]["leader_email"] = email
        if college:
            teams[tid]["college"] = college

    if cname and cname not in teams[tid]["members"]:
        teams[tid]["members"].append(cname)

for tid, t in teams.items():
    leader = t.get("leader_name", "").strip()
    if not t["name"] or t["name"].startswith("504454-"):
        if leader and not leader.lower().startswith("deleteduser"):
            t["name"] = f"Team {leader}"
        else:
            t["name"] = f"Squad {tid}"

print(f"Total processed teams: {len(teams)}")
print(f"Total participants: {sum(len(t['members']) for t in teams.values())}")
sample_keys = list(teams.keys())[:5]
for k in sample_keys:
    print(k, teams[k])
