from pathlib import Path
import re, html
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Flowable, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent
FONT = Path('/Users/ola/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/pdfjs-dist/standard_fonts')
for name, file in [('Body','LiberationSans-Regular.ttf'),('Bold','LiberationSans-Bold.ttf'),('Italic','LiberationSans-Italic.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(FONT/file)))
pdfmetrics.registerFontFamily('Body', normal='Body', bold='Bold', italic='Italic', boldItalic='Bold')
INK=colors.HexColor('#171414'); ROSE=colors.HexColor('#e1bac2'); PAPER=colors.HexColor('#fafaf8'); MUTED=colors.HexColor('#4a4a4a')
styles={
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.5,leading=15.1,textColor=INK,spaceAfter=9),
 'glossary':ParagraphStyle('glossary',fontName='Body',fontSize=10,leading=14,textColor=INK,spaceAfter=5),
 'h1':ParagraphStyle('h1',fontName='Bold',fontSize=39,leading=44,textColor=INK,spaceAfter=12),
 'h2':ParagraphStyle('h2',fontName='Bold',fontSize=19,leading=24,textColor=MUTED,spaceAfter=18),
 'h3':ParagraphStyle('h3',fontName='Bold',fontSize=18,leading=23,textColor=INK,spaceBefore=18,spaceAfter=12,keepWithNext=True),
 'h4':ParagraphStyle('h4',fontName='Bold',fontSize=11.4,leading=16,textColor=INK,spaceBefore=10,spaceAfter=6,keepWithNext=True),
 'caption':ParagraphStyle('caption',fontName='Italic',fontSize=8.3,leading=11.5,textColor=MUTED,spaceAfter=12),
 'ref':ParagraphStyle('ref',fontName='Body',fontSize=8.8,leading=12.6,textColor=MUTED,spaceAfter=9,splitLongWords=True),
 'quote':ParagraphStyle('quote',fontName='Body',fontSize=10,leading=15,textColor=INK,spaceAfter=11,borderPadding=11,backColor=colors.HexColor('#f6edef'),borderColor=ROSE,borderWidth=.5),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=8.6,leading=12,textColor=INK),
 'meta':ParagraphStyle('meta',fontName='Body',fontSize=9,leading=14,textColor=MUTED,spaceAfter=7),
}

def inline(s):
    s=html.escape(s)
    s=re.sub(r'\*\*(.*?)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'(https://[^\s]+)', lambda m:'<link href="'+m.group(1)+'" color="#80535e">'+m.group(1)+'</link>',s)
    return s

class Diagram(Flowable):
    def __init__(self): super().__init__(); self.width=475; self.height=170
    def draw(self):
        c=self.canv
        def box(x,y,w,h,title,lines):
            c.setFillColor(PAPER); c.setStrokeColor(ROSE); c.roundRect(x,y,w,h,7,fill=1,stroke=1)
            c.setFillColor(INK); c.setFont('Bold',9.5); c.drawString(x+10,y+h-17,title)
            c.setFont('Body',8.5)
            for i,line in enumerate(lines): c.drawString(x+10,y+h-32-i*12,line)
        box(0,90,220,70,'ETHEREUM / SEPOLIA',['Historical DeFi transactions','Investor > Pawnshop > Borrower','Repayment > Pawnshop > Investor'])
        box(265,90,220,70,'CREDITCOIN CC3',['BlockProver + SanadCreditOracle','SAG collateral notes','Pool and settlement evidence'])
        c.setStrokeColor(INK); c.line(221,125,261,125); c.line(256,128,261,125); c.line(256,122,261,125)
        c.setFont('Body',7); c.drawCentredString(242,135,'Proof')
        box(0,0,220,62,'COORDINATION',['Discovery / proof construction','API + PostgreSQL + job tracking'])
        box(265,0,220,62,'PHYSICAL CUSTODY',['Appraisal / custody / redemption','Authorized pawnshop + oversight'])
        c.line(110,63,110,87); c.line(107,82,110,87); c.line(113,82,110,87)
        c.line(375,63,375,87); c.line(372,82,375,87); c.line(378,82,375,87)

def table(rows,widths):
    cells=[[Paragraph(inline(str(v)),styles['cell']) for v in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),ROSE),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9),('LINEBELOW',(0,0),(-1,-1),.4,colors.HexColor('#ded8d7')),('ROWBACKGROUNDS',(0,1),(-1,-1),[PAPER,colors.white])]))
    return t

def footer(c,doc):
    w,h=A4
    c.saveState(); c.setStrokeColor(ROSE); c.setLineWidth(.6); c.line(52,44,w-52,44)
    c.setFont('Body',8); c.setFillColor(MUTED); c.drawString(52,30,'SANAD PROTOCOL  /  TECHNICAL WHITE PAPER  /  TESTNET')
    c.drawRightString(w-52,30,f'{doc.page:02d}')
    if doc.page>1:
        c.setFont('Bold',8); c.drawString(52,h-31,'SANAD'); c.setFont('Body',8); c.drawRightString(w-52,h-31,'BUIDL CTC 2026 FALL  |  09 SEPTEMBER 2026')
    c.restoreState()

text=(ROOT.parent.parent/'docs'/'white-paper.md').read_text()
text=re.sub(r'^---\s*$', '\n---\n', text, flags=re.MULTILINE)
story=[]; references=False; glossary=False
for block in text.split('\n\n'):
    block=block.strip()
    if not block: continue
    if block=='---': story.append(PageBreak()); continue
    if block=='@diagram': story.extend([Spacer(1,8),Diagram(),Spacer(1,8)]); continue
    if block=='@selectors':
        story.append(table([['**Function**','**Selector**','**Payment direction**'],['fundLoan(uint256,address,uint256)','0xfdc6f341','Investor to pawnshop'],['disburseLoan(uint256,address,uint256)','0xff408ad3','Pawnshop to borrower'],['repay(uint256,uint256)','0xd8aed145','Borrower to pawnshop'],['settleInvestor(uint256,uint256)','0x58ffdcee','Pawnshop to investor']],[245,83,163]))
        story.append(Spacer(1,10));continue
    if block=='@addresses':
        rows=[['**Contract / network**','**Configured address**']]
        for name,addr in [('SanadCreditOracle / CC3','0x9B926B432bbEFA5405eC9EBB0F7515496c2095a5'),('SanadLiquidityPool / CC3','0x6370114EEda4AC8F43F6c7997cB6C75DF58F4316'),('SAGToken / CC3','0x80b9Ae7D0BEfB042a3eb8fDd1af0DCF6E53bEdE9'),('InvestorVault / Sepolia','0x0e243c2F556eFaDA6352f567AA658b6052F04eD4'),('RepaymentGateway / Sepolia','0x662e21FfB91F35A1f16983e38a9cDAe90f537A80')]: rows.append([name,addr])
        story.append(table(rows,[177,314]));continue
    if block.startswith('# Sanad Protocol'):
        lines=block.splitlines();story.append(Spacer(1,25));story.append(Paragraph('RESEARCH &amp; PROTOCOL DESIGN',styles['meta']));story.append(Spacer(1,18))
        story.append(Paragraph('Sanad Protocol',styles['h1']));story.append(Paragraph(lines[1][3:],styles['h2']))
        for line in lines[2:]:story.append(Paragraph(inline(line),styles['meta']))
        story.append(Spacer(1,20));continue
    if block.startswith('### '):
        lines=block.splitlines();title=lines.pop(0)[4:];references=title=='References and Review Basis' or references
        glossary=title=='Glossary'
        story.append(Paragraph(inline(title),styles['h3']))
        if lines:
            for line in lines:
                if line.startswith('#### '): story.append(Paragraph(inline(line[5:]),styles['h4']))
                else:story.append(Paragraph(inline(line),styles['glossary' if glossary else 'ref' if references else 'body']))
        continue
    if block.startswith('#### '):
        lines=block.splitlines()
        story.append(Paragraph(inline(lines[0][5:]),styles['h4']))
        if len(lines)>1: story.append(Paragraph(inline(' '.join(lines[1:])),styles['body']))
        continue
    style='quote' if block.startswith('> ') else 'caption' if block.startswith(('Figure ','Table ')) else 'ref' if references else 'glossary' if glossary else 'body'
    if block.startswith('> '):block=block[2:]
    story.append(Paragraph(inline(block.replace('\n',' ')),styles[style]))

output=ROOT/'Sanad_Protocol_White_Paper.pdf'
doc=SimpleDocTemplate(str(output),pagesize=A4,rightMargin=52,leftMargin=52,topMargin=54,bottomMargin=61,title='Sanad Protocol: Verifiable Credit. Accountable Gold Finance.',author='Sanad Protocol',subject='Technical white paper | BUIDL CTC 2026 Fall | Testnet implementation',pageCompression=1)
doc.build(story,onFirstPage=footer,onLaterPages=footer)
reader=PdfReader(output)
print('PDF:',output)
print('Pages:',len(reader.pages))
print('Source words:',len(text.split()))
for i,p in enumerate(reader.pages,1): print('Page',i,'words',len(p.extract_text().split()))
