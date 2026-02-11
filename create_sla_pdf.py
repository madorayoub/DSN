from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY, TA_CENTER
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Image, KeepTogether
from reportlab.pdfgen import canvas
import io
import os

# CONSTANTS FOR STANDARDIZATION
FONT_MAIN = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'

SIZE_TITLE = 24
SIZE_SUBTITLE = 14
SIZE_H1 = 12
SIZE_H2 = 11
SIZE_BODY = 10
SIZE_SMALL = 9

SPACE_TITLE = 10
SPACE_SUBTITLE = 20
SPACE_SECTION = 14
SPACE_SUBSECTION = 10
SPACE_PARA = 6
SPACE_LIST_ITEM = 3

LEADING_BODY = 14
LEADING_SMALL = 11

COLOR_PRIMARY = colors.HexColor('#2D5F3F')
COLOR_TEXT = colors.black
COLOR_LGRAY = colors.HexColor('#E8F4F8')

def create_header_footer(canvas, doc):
    """Add footer to each page"""
    canvas.saveState()
    
    # Footer
    footer_text = "Confidential - Service Level Agreement"
    canvas.setFont(FONT_MAIN, 8)
    canvas.setFillColor(colors.grey)
    canvas.drawCentredString(letter[0]/2, 0.4*inch, footer_text)
    
    # Page Number
    page_num_text = f"Page {doc.page}"
    canvas.drawRightString(letter[0] - 0.75*inch, 0.4*inch, page_num_text)
    
    canvas.restoreState()

def create_complete_sla():
    """Create a complete, properly formatted SLA with optimized spacing"""
    # Use the Downloads folder for the output
    output_path = "/Users/ayoub/Downloads/DSN_SLA_2026_FINAL.pdf"
    
    print(f"Generating PDF at: {output_path}")
    
    # Create document with adjusted margins for better space usage
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=72,
        leftMargin=72,
        topMargin=50,
        bottomMargin=50
    )
    
    # Container for elements
    elements = []
    
    # Define consistent styles
    styles = getSampleStyleSheet()
    
    # Logo/Header style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Title'],
        fontName=FONT_BOLD,
        fontSize=SIZE_TITLE,
        textColor=COLOR_PRIMARY,
        spaceAfter=SPACE_TITLE,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontName=FONT_MAIN,
        fontSize=SIZE_SUBTITLE,
        textColor=COLOR_TEXT,
        spaceAfter=SPACE_SUBTITLE,
        alignment=TA_CENTER
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontName=FONT_BOLD,
        fontSize=SIZE_H1,
        textColor=COLOR_TEXT,
        spaceAfter=6,
        spaceBefore=SPACE_SECTION,
        alignment=TA_LEFT,
        keepWithNext=True
    )
    
    subsection_heading = ParagraphStyle(
        'SubsectionHeading',
        parent=styles['Heading2'],
        fontName=FONT_BOLD,
        fontSize=SIZE_H2,
        textColor=COLOR_TEXT,
        spaceAfter=4,
        spaceBefore=SPACE_SUBSECTION,
        alignment=TA_LEFT,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontName=FONT_MAIN,
        fontSize=SIZE_BODY,
        textColor=COLOR_TEXT,
        alignment=TA_JUSTIFY,
        spaceAfter=SPACE_PARA,
        leading=LEADING_BODY
    )
    
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName=FONT_BOLD,
    )
    
    compact_body = ParagraphStyle(
        'CompactBody',
        parent=body_style,
        fontSize=SIZE_SMALL,
        leading=LEADING_SMALL,
        spaceAfter=SPACE_LIST_ITEM
    )

    # Helper function to create standard list items
    def add_list_items(items):
        list_elements = []
        for item in items:
            p = Paragraph(f"• {item}", compact_body)
            list_elements.append(p)
        return list_elements

    # --- CONTENT GENERATION START ---

    # PAGE 1: HEADER AND INTRO
    # Add logo
    elements.append(Spacer(1, 10))
    
    elements.append(Spacer(1, 10))
    
    # Add actual logo image
    logo_path = "/Users/ayoub/.gemini/antigravity/brain/e47cfc41-3873-4a15-8bc2-a28d91fe75ff/uploaded_media_1_1770840985922.png"
    if os.path.exists(logo_path):
        try:
            # Using precise aspect ratio calculation (1024x205 ≈ 5:1)
            # Width 3.5 inches -> Height 0.7 inches
            logo = Image(logo_path, width=3.5*inch, height=0.7*inch) 
            logo.hAlign = 'CENTER'
            elements.append(logo)
        except Exception as e:
             print(f"Error loading logo: {e}")
             elements.append(Paragraph("[LOGO IMAGE FAILED TO LOAD]", title_style))
    else:
        print(f"Warning: Logo path not found: {logo_path}")
        elements.append(Paragraph("DSN", title_style))

    elements.append(Spacer(1, 10))
    
    elements.append(Paragraph("SERVICE LEVEL AGREEMENT", section_heading))
    elements.append(Paragraph("2026 Standard Service Agreement", body_style))
    
    elements.append(Paragraph("Date: ___________________", body_style))
    
    elements.append(Paragraph("This Agreement is entered into by and between:", body_bold))
    
    elements.append(Paragraph("<b>PROVIDER:</b> Direct Sales Network, LLC", body_style))
    elements.append(Paragraph("<b>CLIENT:</b> ___________________________________________", body_style))
    
    # RECITALS
    elements.append(Paragraph("RECITALS", section_heading))
    
    recital1 = """Whereas, DSN is a digital marketing and lead generation agency specializing in 
providing qualified sales opportunities and leads to businesses across B2B and B2C 
sectors through proven marketing strategies and systems; and"""
    elements.append(Paragraph(recital1, body_style))
    
    recital2 = """Whereas, Client desires to engage DSN for such services under the terms and 
conditions set forth herein."""
    elements.append(Paragraph(recital2, body_style))
    
    # SECTION 1
    elements.append(Paragraph("1. TERM AND EFFECTIVE DATE", section_heading))
    
    term_text = """This Agreement shall become effective on the date signed by both parties ("Effective 
Date"). The Agreement shall continue on a month-to-month basis unless terminated by 
either party in accordance with the termination provisions herein. No long-term 
commitment is required beyond the monthly service period."""
    elements.append(Paragraph(term_text, body_style))
    
    # SECTION 2 - Using KeepTogether to keep intro with at least one subsection if possible, though large block
    elements.append(Paragraph("2. SCOPE OF SERVICES: THE 3-ATTACK SYSTEM", section_heading))
    
    scope_intro = """DSN agrees to provide Client with a comprehensive, multi-channel lead generation 
system designed to attack the target market from three simultaneous fronts. Services 
will be customized based on whether Client selects Commercial Services, Residential 
Services, or both."""
    elements.append(Paragraph(scope_intro, body_style))
    
    # 2.1 Commercial Services
    # Grouping subsection title + list together
    s2_1_content = []
    s2_1_content.append(Paragraph("2.1 Commercial Services (3-Attack System)", subsection_heading))
    
    commercial_intro = """For commercial concrete coating opportunities, DSN will execute the following three-pronged approach:"""
    s2_1_content.append(Paragraph(commercial_intro, body_style))
    
    # Attack #1
    s2_1_content.append(Paragraph("<b>Attack #1: Hyper-Targeted ABM Ads</b>", body_style))
    attack1_items = [
        "Account-Based Marketing (ABM) approach targeting specific decision-makers at specific companies",
        "Direct lead generation through ad responses and contact forms",
        "Brand recognition building so outreach contacts already recognize Client",
        "Proof-based creative: project photos, process videos, completed work, credibility markers",
        "Retargeting campaigns to maintain presence with warm prospects"
    ]
    s2_1_content.extend(add_list_items(attack1_items))
    s2_1_content.append(Spacer(1, 4))
    
    # Attack #2
    s2_1_content.append(Paragraph("<b>Attack #2: Omnichannel Cold Outreach</b>", body_style))
    attack2_items = [
        "Data gathering via LinkedIn and Apollo to identify decision-makers (GCs, estimators, PMs, facility managers, business owners, etc.)",
        "Multi-touch outreach sequence: SMS → Email → Voicemail → Cold Calls",
        "Direct contact with decision-makers to get on bidder lists and vendor systems",
        "Discovery of active and upcoming projects (30-90 day pipeline)",
        "Meeting generation and bid opportunity creation"
    ]
    s2_1_content.extend(add_list_items(attack2_items))
    s2_1_content.append(Spacer(1, 4))
    
    engagement_note = """<b>Recommended Engagement Period:</b> While results can be seen within 30 days, DSN 
recommends a 90-day engagement period for optimal performance and best results. 
Clients staying for the full 90-day period will see significantly better outcomes, though 
measurable results will begin appearing within the first 30 days."""
    s2_1_content.append(Paragraph(engagement_note, body_style))
    s2_1_content.append(Spacer(1, 4))
    
    # Attack #3
    s2_1_content.append(Paragraph("<b>Attack #3: Bid Platform Monitoring & Response</b>", body_style))
    attack3_items = [
        "Setup and optimization of Client profiles on platforms (BuildingConnected, PlanHub, etc.)",
        "Daily monitoring for relevant projects in Client's service area",
        "Immediate flagging and routing of opportunities to Client",
        "Response management and follow-up coordination"
    ]
    s2_1_content.extend(add_list_items(attack3_items))
    
    platform_note = """<b>Note:</b> Bid platforms offer free tiers with basic access. Clients may optionally upgrade to 
premium tiers for access to additional opportunities. Premium tier costs vary by platform 
(typically $30-$300/month) and are paid directly by Client to the platform providers if 
desired."""
    s2_1_content.append(Paragraph(platform_note, body_style))
    
    elements.extend(s2_1_content)
    
    # 2.2 Residential Services
    # No forced PageBreak here unless necessary by flow
    s2_2_content = []
    s2_2_content.append(Paragraph("2.2 Residential Services (Optional Add-On)", subsection_heading))
    
    residential_intro = "For clients who also want residential concrete coating leads, DSN will provide:"
    s2_2_content.append(Paragraph(residential_intro, body_style))
    
    residential_items = [
        "Hyper-targeted social media advertising to homeowners",
        "Demographic, location, and interest-based targeting (not broad spray-and-pray)",
        "Quality-focused creative: before/after transformations, garage makeovers, patio coatings",
        "Exclusive lead delivery—leads go only to Client, not to multiple contractors",
        "Simple contact forms designed for high conversion rates"
    ]
    s2_2_content.extend(add_list_items(residential_items))
    s2_2_content.append(Spacer(1, 4))
    elements.append(KeepTogether(s2_2_content))
    
    # 2.3 Supporting Services
    s2_3_content = []
    s2_3_content.append(Paragraph("2.3 Supporting Services (All Plans)", subsection_heading))
    
    supporting_items = [
        "CRM Access: Available upon request for pipeline tracking and lead management",
        "Monthly performance reporting and analysis",
        "Weekly or bi-weekly check-in calls to review progress and strategy",
        "On-demand reporting: Client can request performance updates at any time via phone",
        "Sales assets: Custom landing pages optimized for conversion"
    ]
    s2_3_content.extend(add_list_items(supporting_items))
    elements.append(KeepTogether(s2_3_content))
    
    # TERRITORY PROTECTION
    tp_content = []
    tp_content.append(Paragraph("2.4 Territory Protection", subsection_heading))
    
    territory_text = """DSN agrees not to service direct competitors within the Client's designated primary 
service area during the term of this Agreement. This ensures Client maintains a 
competitive advantage in their local market without DSN supporting competing 
contractors in the same territory."""
    tp_content.append(Paragraph(territory_text, body_style))
    elements.append(KeepTogether(tp_content))
    
    # SECTION 3
    s3_content = []
    s3_content.append(Paragraph("3. FEES AND PAYMENT TERMS", section_heading))
    
    # Fee table
    # Wrap text in Paragraph to ensure it fits within the column
    ad_spend_text = Paragraph("Target $1,500.00 per month (paid directly by Client to platforms)", compact_body)
    
    fee_data = [
        ['Fee Type', 'Amount'],
        ['Monthly Service Fee', '$_____________ per month'],
        ['Marketing Budget (Ad Spend)', ad_spend_text]
    ]
    
    fee_table = Table(fee_data, colWidths=[3*inch, 3.5*inch])
    fee_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_LGRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_TEXT),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), SIZE_SMALL),
        ('FONTNAME', (0, 1), (-1, -1), FONT_MAIN),
        ('FONTSIZE', (0, 1), (-1, -1), SIZE_SMALL),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    s3_content.append(fee_table)
    s3_content.append(Spacer(1, 8))
    
    billing_items = [
        "<b>Billing Cycle:</b> Service fees will be billed monthly on the same day of each month corresponding to the Effective Date.",
        "<b>Payment Method:</b> Client authorizes DSN to charge the designated Credit Card or ACH account for all fees due under this Agreement. DSN accepts all major credit cards except American Express due to payment processor limitations."
    ]
    for item in billing_items:
        s3_content.append(Paragraph(item, body_style))
        
    elements.append(KeepTogether(s3_content))
    
    # SECTION 3.1 - PERFORMANCE GUARANTEE
    s3_1_content = []
    
    # Using specific title from user text: "90-Day Performance Guarantee"
    # But keeping numbering style if desired, or just using their title.
    # User said: "the text in the section below needs to be replaced with the text above"
    # The user provided text starts with "90-Day Performance Guarantee"
    # I will stick to the section numbering structure for consistency: "3.1 90-Day Performance Guarantee"
    
    s3_1_content.append(Paragraph("3.1 Performance Guarantee", subsection_heading))
    
    # Intro
    guarantee_intro = """DSN guarantees the effectiveness of the 3-Attack System with a performance 
guarantee contingent upon Client's full 90-day engagement. This period allows the system 
adequate time to reach optimal performance while protecting Client's investment."""
    s3_1_content.append(Paragraph(guarantee_intro, body_style))
    s3_1_content.append(Spacer(1, 6))

    # Guarantee Terms
    s3_1_content.append(Paragraph("<b>Guarantee Terms:</b> If Client completes the full 90-day period, follows all Section 5 responsibilities, and DSN fails to meet the minimum performance targets documented in Section 4, Client receives a full refund of service fees paid during the 90-day period. The commitment period begins on the Effective Date and requires three consecutive months of active, uninterrupted service.", body_style))
    s3_1_content.append(Spacer(1, 6))

    # Eligibility Criteria
    s3_1_content.append(Paragraph("<b>Eligibility Criteria:</b> Client must demonstrate:", body_style))
    
    eligibility_criteria = [
        "Full 90-day engagement without cancellation",
        "Adherence to all Client Responsibilities including prompt response to opportunities (1-2 hours during business hours), participation in check-in calls, provision of required materials, and professional lead communication",
        "Performance shortfall by DSN despite Client's full cooperation",
        "Documented evidence of compliance and performance gaps"
    ]
    
    # Manually creating list items with numbers as requested by text format "(1)..." but list is cleaner
    # User text: "(1) Full 90-day engagement..., (2) Adherence..., (3) Performance..., (4) Documented..."
    # I will present this as a clean list for better readability as requested ("organize it well and structure it well")
    for i, item in enumerate(eligibility_criteria, 1):
        s3_1_content.append(Paragraph(f"{i}. {item}", compact_body))
    s3_1_content.append(Spacer(1, 6))

    # Refund Process
    s3_1_content.append(Paragraph("<b>Refund Process:</b> Client submits a written refund request with documentation within 7 days after the 90-day period. Documentation must show completion of the full period, compliance with all responsibilities, and performance below targets. DSN reviews within 10 business days; approved refunds issue within 15 business days to the original payment method.", body_style))
    s3_1_content.append(Spacer(1, 6))

    # Exclusions
    s3_1_content.append(Paragraph("<b>Exclusions:</b> Guarantee does not apply if Client: terminates before 90 days, fails any Section 5 responsibility, doesn't respond promptly to opportunities, misses check-in calls, fails to provide required materials, or if performance issues stem from factors outside DSN's control (extreme market conditions, non-competitive pricing, service quality issues, or geographic service limitations).", body_style))
    s3_1_content.append(Spacer(1, 6))

    # Closing Note
    closing_note = "The 90-day period allows the 3-Attack System to reach optimal performance. While results typically begin within 30 days, maximum ROI is achieved through sustained engagement."
    s3_1_content.append(Paragraph(f"<i>{closing_note}</i>", body_style))
    
    elements.append(KeepTogether(s3_1_content))
    
    # SECTION 4
    s4_content = []
    s4_content.append(Paragraph("4. PERFORMANCE TARGETS & DELIVERABLES", section_heading))
    
    perf_intro = """DSN is committed to delivering measurable results. The following targets apply based 
on the selected service package:"""
    s4_content.append(Paragraph(perf_intro, body_style))
    
    # Performance table
    perf_data = [
        ['Metric', 'Target / Expected Range'],
        ['Commercial Opportunities (Monthly)', '[________ to ________] opportunities per month'],
        ['Residential Leads (Monthly, if applicable)', '[________ to ________] leads per month']
    ]
    
    perf_table = Table(perf_data, colWidths=[3*inch, 3.5*inch])
    perf_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_LGRAY),
        ('TEXTCOLOR', (0, 0), (-1, 0), COLOR_TEXT),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), SIZE_SMALL),
        ('FONTNAME', (0, 1), (-1, -1), FONT_MAIN),
        ('FONTSIZE', (0, 1), (-1, -1), SIZE_SMALL),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, COLOR_TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    s4_content.append(perf_table)
    s4_content.append(Spacer(1, 4))
    
    perf_note = """<b>Note:</b> Commercial opportunities include bid invitations, bidder list additions, direct 
project inquiries, and qualified prospect meetings. Performance targets are subject to 
customization based on Client's service area, market conditions, and selected service 
package. Specific targets will be established during onboarding and documented in 
monthly reports."""
    s4_content.append(Paragraph(perf_note, body_style))
    
    elements.append(KeepTogether(s4_content))
    
    # SECTION 5
    s5_content = []
    s5_content.append(Paragraph("5. CLIENT RESPONSIBILITIES", section_heading))
    
    client_intro = "To ensure campaign success and optimal results, Client agrees to:"
    s5_content.append(Paragraph(client_intro, body_style))
    
    client_responsibilities = [
        "Respond to all generated opportunities promptly (recommended within 1-2 hours during business hours)",
        "Update lead status and progress through provided communication channels",
        "Provide necessary business information, logos, photos (5-10 project photos), and case studies (2-3 examples)",
        "Provide insurance/certifications and service area details",
        "Maintain professional communication with all leads and opportunities",
        "Provide timely pricing/estimating for bid opportunities",
        "Participate in weekly or bi-weekly check-in calls",
        "Approve recommended ad spend adjustments or creative changes when appropriate"
    ]
    s5_content.extend(add_list_items(client_responsibilities))
    elements.append(KeepTogether(s5_content))
    
    # SECTION 6
    s6_content = []
    s6_content.append(Paragraph("6. DELIVERABLES AND REPORTING", section_heading))
    
    reporting_intro = "DSN will provide transparency into campaign performance through:"
    s6_content.append(Paragraph(reporting_intro, body_style))
    
    reporting_items = [
        "<b>Monthly Performance Reports:</b> Comprehensive monthly reports documenting all activities and results",
        "<b>Regular Check-In Calls:</b> Weekly or bi-weekly performance review sessions conducted via phone or Zoom",
        "<b>On-Demand Reporting:</b> Client can request performance updates at any time by phone—DSN will provide immediate updates or follow up with detailed reports",
        "<b>Key Metrics:</b> Reporting includes opportunities generated, outreach activity, bid invites, conversations started, ad performance, and conversion data",
        "<b>CRM Access (Optional):</b> Available upon request for real-time pipeline visibility"
    ]
    s6_content.extend(add_list_items(reporting_items))
    elements.append(KeepTogether(s6_content))
    
    # SECTION 7
    s7_content = []
    s7_content.append(Paragraph("7. CONFIDENTIALITY AND DATA SECURITY", section_heading))
    
    confidentiality_text = """Both parties agree to keep confidential all proprietary information shared during the term 
of this Agreement, including business strategies, client data, and advertising methods. 
DSN employs strict security measures to protect Client data. Credit card information is 
stored securely via compliant third-party processors and used solely for billing service 
fees and setting up third-party advertising platforms."""
    s7_content.append(Paragraph(confidentiality_text, body_style))
    elements.append(KeepTogether(s7_content))
    
    # SECTION 8
    s8_content = []
    s8_content.append(Paragraph("8. INTELLECTUAL PROPERTY", section_heading))
    
    ip_text = """All creative assets, ad copy, campaign structures, and marketing strategies developed 
by DSN remain the intellectual property of DSN. Client retains full ownership of their 
pre-existing brand assets, business information, and customer lists. Upon termination, 
Client retains access to all lead data generated during the active service period."""
    s8_content.append(Paragraph(ip_text, body_style))
    elements.append(KeepTogether(s8_content))
    
    # SECTION 9
    s9_content = []
    s9_content.append(Paragraph("9. LIMITATIONS AND DISCLAIMERS", section_heading))
    
    limitations_text = """While DSN guarantees the execution of the 3-Attack System as outlined in Section 2, 
DSN cannot and does not guarantee specific closed sales revenue, as this depends on 
factors outside DSN's control, including Client's sales execution, pricing, market 
competition, and follow-up responsiveness. Ad platform performance may vary based 
on seasonal market conditions and platform algorithm changes. DSN's performance 
targets represent expected ranges based on industry benchmarks and historical data, 
not guaranteed minimums."""
    s9_content.append(Paragraph(limitations_text, body_style))
    elements.append(KeepTogether(s9_content))
    
    # SECTION 10
    s10_content = []
    s10_content.append(Paragraph("10. TERMINATION", section_heading))
    
    s10_content.append(Paragraph("<b>Termination for Convenience:</b>", body_bold))
    term_conv = """Either party may terminate this Agreement at any time with seven (7) days' written 
notice prior to the next billing cycle."""
    s10_content.append(Paragraph(term_conv, body_style))
    
    s10_content.append(Paragraph("<b>Termination for Cause:</b>", body_bold))
    term_cause = """This Agreement may be terminated immediately for material breach, including 
non-payment or lack of cooperation from either party."""
    s10_content.append(Paragraph(term_cause, body_style))
    
    s10_content.append(Paragraph("<b>Effect of Termination:</b>", body_bold))
    term_effect = """Upon termination, Client retains access to all lead data generated during the active 
service period. All future billing will cease after the notice period. Client will retain access 
to CRM (if granted) for 30 days post-termination to export data."""
    s10_content.append(Paragraph(term_effect, body_style))
    elements.append(KeepTogether(s10_content))
    
    # SECTION 11
    s11_content = []
    s11_content.append(Paragraph("11. MODIFICATIONS", section_heading))
    
    modifications_text = """Any modifications to this Agreement must be in writing and signed by both parties. DSN 
reserves the right to adjust pricing with thirty (30) days' prior written notice to Client."""
    s11_content.append(Paragraph(modifications_text, body_style))
    elements.append(KeepTogether(s11_content))
    
    # SECTION 12
    s12_content = []
    s12_content.append(Paragraph("12. GOVERNING LAW AND DISPUTE RESOLUTION", section_heading))
    
    governing_text = """This Agreement shall be governed by and construed in accordance with the laws of the 
State of Florida. In the event of any dispute arising out of or relating to this Agreement, 
the parties agree to first attempt to resolve the matter through good-faith negotiation. If 
unresolved, the parties agree to submit to mediation in Florida before pursuing litigation. 
The exclusive venue for any legal action shall be the state or federal courts located in 
Florida."""
    s12_content.append(Paragraph(governing_text, body_style))
    elements.append(KeepTogether(s12_content))
    
    # SECTION 13
    s13_content = []
    s13_content.append(Paragraph("13. ENTIRE AGREEMENT", section_heading))
    
    entire_text = """This Agreement constitutes the entire agreement between the parties and supersedes 
all prior agreements, understandings, and representations, whether oral or written, 
regarding the subject matter hereof."""
    s13_content.append(Paragraph(entire_text, body_style))
    elements.append(KeepTogether(s13_content))
    
    # PAGE BREAK FOR SIGNATURES
    # We want signatures on a new page only if they don't fit
    elements.append(Spacer(1, 20))
    
    # SIGNATURES
    sig_content = []
    sig_content.append(Paragraph("SIGNATURES", section_heading))
    sig_content.append(Spacer(1, 20))
    
    # Signature table with actual signature image
    signature_path = "/Users/ayoub/.gemini/antigravity/brain/e47cfc41-3873-4a15-8bc2-a28d91fe75ff/uploaded_media_0_1770840985922.png"
    
    # Handle signature image loading
    sig_image_cell = ''
    if os.path.exists(signature_path):
        try:
             # Using precise aspect ratio calculation (1024x369 ≈ 2.77:1)
             # Width 1.8 inches -> Height 0.65 inches
             sig_image_cell = Image(signature_path, width=1.8*inch, height=0.65*inch)
        except Exception as e:
             print(f"Error loading signature: {e}")
             sig_image_cell = "[Signature Failed Load]"
    else:
        print("Warning: Signature path not found")
        sig_image_cell = "[Signature Not Found]"

    
    sig_data = [
        ['CLIENT', 'PROVIDER: Direct Sales Network, LLC'],
        ['', ''],
        ['Company:', 'Name: Andrew Armstrong'],
        ['_________________________________', ''],
        ['', 'Title: Director'],
        ['Name:', ''],
        ['_________________________________', 'Date:'],
        ['', '_________________________________'],
        ['Title:', ''],
        ['_________________________________', sig_image_cell], # Signature under Date line
        ['', ''],
        ['Date:', ''],
        ['_________________________________', ''],
        ['', ''],
        ['Signature:', ''],
        ['_________________________________', ''] # Removed signature from bottom
    ]
    
    sig_table = Table(sig_data, colWidths=[3.25*inch, 3.25*inch])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), FONT_MAIN),
        ('FONTSIZE', (0, 0), (-1, -1), SIZE_BODY),
        ('FONTNAME', (0, 0), (1, 0), FONT_BOLD),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
    ]))
    
    sig_content.append(sig_table)
    elements.append(KeepTogether(sig_content))
    
    # Build PDF
    doc.build(elements, onFirstPage=create_header_footer, onLaterPages=create_header_footer)
    
    print(f"\n✅ PDF created successfully!")
    print(f"📍 Location: {output_path}")
    print(f"\nYou can find your PDF at: /Users/ayoub/Downloads/DSN_SLA_2026_FINAL.pdf")
    
    return output_path

if __name__ == "__main__":
    create_complete_sla()
