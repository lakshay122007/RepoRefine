import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoRefine",
  description: "AI-powered GitHub profile analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
