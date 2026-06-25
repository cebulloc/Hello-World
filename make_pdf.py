#!/usr/bin/env python3
"""Lightweight markdown-ish -> PDF renderer using fpdf2 (core fonts, latin-1 safe)."""
import re, sys
from fpdf import FPDF

NAVY = (11, 61, 97)
BLUE = (20, 90, 138)
GREEN = (46, 139, 61)
LIGHT = (245, 248, 250)
GREY = (110, 110, 110)

REPL = {
    "’": "'", "‘": "'", "“": '"', "”": '"',
    "–": "-", "—": " - ", "…": "...", "→": "->",
    "°": " deg", "½": "1/2", "¾": "3/4", "¼": "1/4",
    "×": "x", "⁄": "/", "·": "-", "−": "-",
    "é": "e", "è": "e", "í": "i", "ñ": "n",
    "•": "-", "▪": "-", "✔": "[x]", "✓": "[x]",
}

def clean(t):
    for k, v in REPL.items():
        t = t.replace(k, v)
    # drop any remaining non-latin1 (emoji etc.)
    return t.encode("latin-1", "ignore").decode("latin-1")

class PDF(FPDF):
    def header(self):
        pass
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(*GREY)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")

def render(md, out, title, subtitle=""):
    pdf = PDF(format="A4")
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(18, 16, 18)
    pdf.add_page()
    W = pdf.w - pdf.l_margin - pdf.r_margin

    # title block
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(*NAVY)
    pdf.multi_cell(W, 9, clean(title))
    pdf.set_draw_color(*NAVY); pdf.set_line_width(0.8)
    y = pdf.get_y() + 1
    pdf.line(pdf.l_margin, y, pdf.l_margin + W, y)
    pdf.ln(4)
    if subtitle:
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(*GREY)
        pdf.multi_cell(W, 5, clean(subtitle))
        pdf.ln(2)

    for raw in md.split("\n"):
        line = raw.rstrip()
        s = clean(line)
        if not s.strip():
            pdf.ln(2.2); continue
        # horizontal rule
        if re.match(r"^---+$", s.strip()):
            y = pdf.get_y() + 1
            pdf.set_draw_color(200, 210, 220); pdf.set_line_width(0.3)
            pdf.line(pdf.l_margin, y, pdf.l_margin + W, y); pdf.ln(3); continue
        # headings
        m = re.match(r"^(#{1,4})\s+(.*)$", s)
        if m:
            lvl = len(m.group(1)); txt = m.group(2)
            if lvl == 1:
                pdf.ln(2); pdf.set_font("Helvetica", "B", 16); pdf.set_text_color(*NAVY)
                pdf.multi_cell(W, 7, txt)
                yy = pdf.get_y()+0.5; pdf.set_draw_color(*NAVY); pdf.set_line_width(0.4)
                pdf.line(pdf.l_margin, yy, pdf.l_margin+W, yy); pdf.ln(2.5)
            elif lvl == 2:
                pdf.ln(1.5); pdf.set_font("Helvetica", "B", 13); pdf.set_text_color(*BLUE)
                pdf.multi_cell(W, 6, txt); pdf.ln(1)
            else:
                pdf.ln(1); pdf.set_font("Helvetica", "B", 11); pdf.set_text_color(50,50,50)
                pdf.multi_cell(W, 5.5, txt); pdf.ln(0.5)
            continue
        # bullets (support one level of indent)
        m = re.match(r"^(\s*)[-*]\s+(.*)$", s)
        if m:
            indent = len(m.group(1)); txt = m.group(2)
            off = 4 + (6 if indent >= 2 else 0)
            pdf.set_font("Helvetica", "", 10.5); pdf.set_text_color(30,30,30)
            x0 = pdf.l_margin + off
            pdf.set_xy(x0, pdf.get_y())
            pdf.cell(4, 5, "-")
            pdf.set_xy(x0+4, pdf.get_y())
            pdf.multi_cell(W-off-4, 5, render_inline(pdf, txt, 10.5))
            continue
        # numbered list
        m = re.match(r"^(\s*)(\d+)\.\s+(.*)$", s)
        if m:
            num = m.group(2); txt = m.group(3)
            pdf.set_font("Helvetica", "", 10.5); pdf.set_text_color(30,30,30)
            x0 = pdf.l_margin + 4
            pdf.set_xy(x0, pdf.get_y())
            pdf.cell(6, 5, f"{num}.")
            pdf.set_xy(x0+6, pdf.get_y())
            pdf.multi_cell(W-10, 5, render_inline(pdf, txt, 10.5))
            continue
        # plain paragraph
        pdf.set_font("Helvetica", "", 10.5); pdf.set_text_color(20,20,20)
        pdf.multi_cell(W, 5, render_inline(pdf, s, 10.5))

    pdf.output(out)

def render_inline(pdf, txt, size):
    # strip ** bold markers (fpdf multi_cell has no inline styling); keep text
    return re.sub(r"\*\*(.*?)\*\*", r"\1", txt)

if __name__ == "__main__":
    src, out, title = sys.argv[1], sys.argv[2], sys.argv[3]
    sub = sys.argv[4] if len(sys.argv) > 4 else ""
    with open(src) as f:
        render(f.read(), out, title, sub)
    print("wrote", out)
