import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verified Agent Actions",
  description: "A starter kit for agent actions secured with Auth0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
