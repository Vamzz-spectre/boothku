import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Boothku - Photobooth Online Aesthetic & Seru",
  description:
    "Website Photo Booth online kekinian dengan beragam template estetik (Twin Strip, Y2K Digicam, Koran Vintage, Spotify Playlist), filter real-time, live camera countdown, dan download photostrip gratis.",
  icons: {
    icon: "/images/favicon.ico",
    apple: "/images/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
