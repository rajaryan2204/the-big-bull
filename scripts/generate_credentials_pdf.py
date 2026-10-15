import csv
import re
import os
import json
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

CSV_PATH = "/Users/rajaryan/Downloads/Big bull.csv"

def extract_clean_mobile(mobile_str):
    digits = re.sub(r"\D", "", mobile_str or "")
    if digits.startswith("91") and len(digits) == 12:
        return digits[2:]
    return digits

def parse_csv_data():
    with open(CSV_PATH, "r", encoding="utf-8", errors="ignore") as f:
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

        clean_mob = extract_clean_mobile(mobile)

        if tid not in teams:
            teams[tid] = {
                "team_id": tid,
                "team_name": tname,
                "leader_name": "",
                "leader_mobile": "",
                "leader_email": "",
                "college": college,
                "members": [],
                "member_details": [],
                "pay_status": pay_status,
                "reg_status": reg_status,
            }

        is_leader = role.lower() == "team leader" or not teams[tid]["leader_name"]
        if is_leader:
            teams[tid]["leader_name"] = cname
            teams[tid]["leader_mobile"] = clean_mob
            teams[tid]["leader_email"] = email
            if college:
                teams[tid]["college"] = college

        if cname and cname not in teams[tid]["members"]:
            teams[tid]["members"].append(cname)
            teams[tid]["member_details"].append({
                "name": cname,
                "role": role,
                "mobile": clean_mob,
                "email": email
            })

    # Polish team names and passwords
    team_list = []
    for tid, t in teams.items():
        leader = t["leader_name"]
        raw_name = t["team_name"]
        
        # Friendly team display name
        if not raw_name or raw_name.startswith("504454-"):
            if leader and not leader.lower().startswith("deleteduser"):
                display_name = f"Team {leader}"
            else:
                display_name = f"Squad {tid}"
        else:
            display_name = raw_name

        # Password / Access Code
        pwd = t["leader_mobile"]
        if not pwd or pwd == "9999999999" or len(pwd) < 6:
            pwd = "bull2026"

        t["display_name"] = display_name
        t["password"] = pwd
        team_list.append(t)

    # Sort teams: first paid/complete, then alphabetically by display_name
    team_list.sort(key=lambda x: (0 if x["pay_status"] == "paid" else 1, x["display_name"].lower()))
    return team_list

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#475569"))
        
        # Header banner rule
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 560, 806, 560)

        # Header small text
        self.drawString(36, 565, "THE BIG BULL Championship 2026 • Official Squad Credentials Roster")
        self.drawRightString(806, 565, "Terminal Login: https://the-big-bull.vercel.app/join")

        # Footer
        self.line(36, 30, 806, 30)
        self.setFont("Helvetica", 8)
        self.drawString(36, 20, "Confidential • For Registered Participants & Venue Invigilators Only • Fallback Access Code: bull2026")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(806, 20, page_str)
        self.restoreState()

def generate_pdf(teams, output_path):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=landscape(A4),
        leftMargin=36,
        rightMargin=36,
        topMargin=46,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom typography
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=2,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=10,
    )
    badge_style = ParagraphStyle(
        "BadgeText",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0369A1"),
    )
    th_style = ParagraphStyle(
        "TH",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1, # Center
    )
    cell_code = ParagraphStyle(
        "CellCode",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#1E3A8A"), # Dark blue
        alignment=1,
    )
    cell_pwd = ParagraphStyle(
        "CellPwd",
        parent=styles["Normal"],
        fontName="Courier-Bold",
        fontSize=9,
        leading=11,
        textColor=colors.HexColor("#047857"), # Emerald green
        alignment=1,
    )
    cell_bold = ParagraphStyle(
        "CellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#0F172A"),
    )
    cell_normal = ParagraphStyle(
        "CellNormal",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#334155"),
    )
    cell_center = ParagraphStyle(
        "CellCenter",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#334155"),
        alignment=1,
    )
    cell_paid = ParagraphStyle(
        "CellPaid",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#065F46"),
        alignment=1,
    )
    cell_unpaid = ParagraphStyle(
        "CellUnpaid",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#9A3412"),
        alignment=1,
    )

    story = []

    # Title block
    story.append(Paragraph("THE BIG BULL CHAMPIONSHIP 2026", title_style))
    summary_text = (
        f"<b>Official Squad Directory & Login Credentials</b> &nbsp;|&nbsp; "
        f"Total Registered Squads: <b>{len(teams)}</b> &nbsp;|&nbsp; "
        f"Total Candidates: <b>{sum(len(t['members']) for t in teams)}</b> &nbsp;|&nbsp; "
        f"Tournament Date: <b>16 Oct 2026, 11:30 AM IST</b>"
    )
    story.append(Paragraph(summary_text, subtitle_style))

    # Fast Instructions Bar
    instr_data = [
        [
            Paragraph("<b>PORTAL LOGIN INSTRUCTIONS</b>", ParagraphStyle("B1", fontName="Helvetica-Bold", fontSize=8.5, textColor=colors.HexColor("#1E293B"))),
            Paragraph("1. Open <b>the-big-bull.vercel.app/join</b> on mobile in Incognito / Private tab.", ParagraphStyle("B2", fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#334155"))),
            Paragraph("2. Enter <b>Team ID</b> as Username and <b>Password</b> as listed below.", ParagraphStyle("B3", fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#334155"))),
            Paragraph("3. Starting balance: <b>5,000 Coins</b>. Emergency Password: <b>bull2026</b>", ParagraphStyle("B4", fontName="Helvetica", fontSize=8, textColor=colors.HexColor("#0369A1"))),
        ]
    ]
    instr_table = Table(instr_data, colWidths=[140, 210, 210, 210])
    instr_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(instr_table)
    story.append(Spacer(1, 8))

    # Table Header
    headers = [
        Paragraph("#", th_style),
        Paragraph("Team ID<br/>(Login ID)", th_style),
        Paragraph("Team Name", th_style),
        Paragraph("Squad Members & Roles", th_style),
        Paragraph("Password<br/>(Access Code)", th_style),
        Paragraph("College / Institute", th_style),
        Paragraph("Payment<br/>Status", th_style),
    ]

    col_widths = [24, 68, 120, 220, 80, 205, 53]

    table_rows = [headers]

    for idx, t in enumerate(teams, start=1):
        # Format members string
        m_lines = []
        for m in t["member_details"]:
            role_badge = " [Leader]" if m["role"].lower() == "team leader" else ""
            m_lines.append(f"<b>{m['name']}</b>{role_badge}")
        members_p = Paragraph("<br/>".join(m_lines), cell_normal)

        team_name_p = Paragraph(f"<b>{t['display_name']}</b>", cell_bold)
        
        # Clean college name
        coll = t.get("college", "").strip() or "Sant Longowal Institute of Engg & Tech"
        if len(coll) > 42:
            coll = coll[:40] + "..."
        college_p = Paragraph(coll, cell_normal)

        is_paid = t["pay_status"] == "paid"
        status_p = Paragraph("PAID" if is_paid else "VERIFIED", cell_paid if is_paid else cell_unpaid)

        row = [
            Paragraph(str(idx), cell_center),
            Paragraph(t["team_id"], cell_code),
            team_name_p,
            members_p,
            Paragraph(t["password"], cell_pwd),
            college_p,
            status_p,
        ]
        table_rows.append(row)

    table = Table(table_rows, colWidths=col_widths, repeatRows=1)
    
    t_style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]

    # Alternating row background
    for r in range(1, len(table_rows)):
        bg = colors.HexColor("#F8FAFC") if r % 2 == 0 else colors.white
        t_style.append(("BACKGROUND", (0, r), (-1, r), bg))

    table.setStyle(TableStyle(t_style))
    story.append(table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Generated PDF successfully: {output_path}")

if __name__ == "__main__":
    teams = parse_csv_data()
    print(f"Parsed {len(teams)} teams.")

    # 1. Output to Desktop/the-big-bull
    out1 = "/Users/rajaryan/Desktop/the-big-bull/THE_BIG_BULL_2026_PARTICIPANT_CREDENTIALS.pdf"
    generate_pdf(teams, out1)

    # 2. Output to Downloads
    out2 = "/Users/rajaryan/Downloads/THE_BIG_BULL_2026_PARTICIPANT_CREDENTIALS.pdf"
    generate_pdf(teams, out2)

    # 3. Output to Artifacts directory
    art_dir = "/Users/rajaryan/.gemini/antigravity/brain/eb0f941e-a5d9-4edd-ab79-9181f23ae840"
    if os.path.exists(art_dir):
        out3 = os.path.join(art_dir, "THE_BIG_BULL_2026_PARTICIPANT_CREDENTIALS.pdf")
        generate_pdf(teams, out3)
