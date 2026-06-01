import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Archery Score Entry",
  description: "COS20031 Archery Score Recording App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{children}</body>
    </html>
  );
}
