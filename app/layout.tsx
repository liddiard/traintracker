import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrainTracker",
  description: "Track your US Amtrak train with a live map and notifications",
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
