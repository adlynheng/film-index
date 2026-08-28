import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Film Index",
  description:
    "Everything I've watched, kept in one place. Films, series, animation and documentaries — logged as I go, with the people who made them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink font-sans antialiased">{children}</body>
    </html>
  );
}
