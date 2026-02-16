import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";

interface AnalysisData {
  truthScore: number;
  verdict: string;
  detectedIssues: Array<{
    text: string;
    severity: "high" | "medium" | "low";
  }>;
  factVerification: Array<{
    claim: string;
    status: "true" | "false" | "disputed";
    source: string;
  }>;
  sentimentAnalysis: {
    tone: string;
    emotionalLanguage: string[];
    capsUsage: number;
  };
  summary: string;
  contentPreview?: string;
  contentType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: AnalysisData = await request.json();

    if (!data || typeof data.truthScore !== "number") {
      return NextResponse.json(
        { error: "Valid analysis data is required" },
        { status: 400 },
      );
    }

    // Generate PDF
    const pdf = generatePDF(data);

    // Convert to buffer
    const pdfBuffer = Buffer.from(pdf.output("arraybuffer"));

    // Return PDF as binary response
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="veritrue-analysis-report.pdf"',
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}

function generatePDF(data: AnalysisData): jsPDF {
  const pdf = new jsPDF();
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [0, 212, 170];
  const textColor: [number, number, number] = [51, 51, 51];
  const lightGray: [number, number, number] = [128, 128, 128];
  const errorColor: [number, number, number] = [255, 71, 87];
  const warningColor: [number, number, number] = [255, 193, 7];
  const successColor: [number, number, number] = [0, 212, 170];

  // Header
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, 210, 40, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont("helvetica", "bold");
  pdf.text("VeriTrue", 20, 25);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Verification Report", 20, 33);

  pdf.setFontSize(10);
  pdf.text(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    150,
    25,
  );

  yPos = 55;

  // Truth Score Section
  pdf.setTextColor(...textColor);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Truth Score", 20, yPos);

  yPos += 15;

  // Score circle (simplified as text)
  const scoreColor =
    data.truthScore >= 70
      ? successColor
      : data.truthScore >= 40
        ? warningColor
        : errorColor;
  pdf.setFillColor(...scoreColor);
  pdf.circle(40, yPos + 5, 15, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${data.truthScore}%`, 33, yPos + 8);

  pdf.setTextColor(...textColor);
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Verdict: ${data.verdict}`, 65, yPos + 3);
  pdf.setTextColor(...lightGray);
  pdf.setFontSize(10);
  pdf.text(`Content Type: ${data.contentType || "Text"}`, 65, yPos + 10);

  yPos += 35;

  // Divider
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPos, 190, yPos);
  yPos += 10;

  // Detected Issues Section
  pdf.setTextColor(...textColor);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Detected Issues", 20, yPos);
  yPos += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  for (const issue of data.detectedIssues) {
    const issueColor =
      issue.severity === "high"
        ? errorColor
        : issue.severity === "medium"
          ? warningColor
          : successColor;

    // Severity indicator
    pdf.setFillColor(...issueColor);
    pdf.circle(23, yPos + 1, 2, "F");

    // Issue text with word wrap
    pdf.setTextColor(...textColor);
    const lines = pdf.splitTextToSize(issue.text, 160);
    pdf.text(lines, 30, yPos + 3);

    yPos += lines.length * 5 + 5;

    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }
  }

  yPos += 10;

  // Fact Verification Section
  if (data.factVerification && data.factVerification.length > 0) {
    pdf.setTextColor(...textColor);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Fact Verification", 20, yPos);
    yPos += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    for (const fact of data.factVerification) {
      const factColor =
        fact.status === "true"
          ? successColor
          : fact.status === "false"
            ? errorColor
            : warningColor;

      // Status badge
      pdf.setFillColor(...factColor);
      pdf.roundedRect(20, yPos - 3, 25, 8, 2, 2, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.text(fact.status.toUpperCase(), 23, yPos + 2);

      // Claim text
      pdf.setTextColor(...textColor);
      pdf.setFontSize(10);
      const claimLines = pdf.splitTextToSize(fact.claim, 130);
      pdf.text(claimLines, 50, yPos + 2);

      yPos += claimLines.length * 5 + 3;

      // Source
      pdf.setTextColor(...lightGray);
      pdf.setFontSize(8);
      pdf.text(`Source: ${fact.source}`, 50, yPos);

      yPos += 10;

      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
    }

    yPos += 5;
  }

  // Sentiment Analysis Section
  pdf.setTextColor(...textColor);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Sentiment Analysis", 20, yPos);
  yPos += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");

  pdf.text(`Tone: ${data.sentimentAnalysis.tone}`, 20, yPos);
  yPos += 7;

  pdf.text(
    `Emotional Language: ${data.sentimentAnalysis.emotionalLanguage.join(", ")}`,
    20,
    yPos,
  );
  yPos += 7;

  pdf.text(`ALL CAPS Usage: ${data.sentimentAnalysis.capsUsage}%`, 20, yPos);
  yPos += 15;

  // Summary Section
  pdf.setTextColor(...textColor);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Analysis Summary", 20, yPos);
  yPos += 10;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  const summaryLines = pdf.splitTextToSize(data.summary, 170);
  pdf.text(summaryLines, 20, yPos);

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(...lightGray);
  pdf.text(
    "Generated by VeriTrue - AI-Powered Media Verification Platform",
    20,
    285,
  );
  pdf.text("This report is for informational purposes only.", 20, 290);

  return pdf;
}
