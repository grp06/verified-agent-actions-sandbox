import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Verified Agent Actions",
  description: "A GitHub issue agent secured with Auth0 Token Vault",
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
