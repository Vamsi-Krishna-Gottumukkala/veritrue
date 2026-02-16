import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "VeriTrue - AI-Powered Media Verification Platform",
  description:
    "Detect fake news and manipulated images with advanced forensic analysis and machine learning technology. VeriTrue provides accurate, real-time verification.",
  keywords:
    "fake news detection, image forensics, fact checking, AI verification, media analysis",
  openGraph: {
    title: "VeriTrue - AI-Powered Media Verification Platform",
    description:
      "Detect fake news and manipulated images with advanced forensic analysis and machine learning.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
