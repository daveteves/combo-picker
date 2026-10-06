import "./globals.css";
import { Barlow_Condensed, IBM_Plex_Sans } from "next/font/google";

const flap = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-flap" });
const body = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body" });

export const metadata = {
  title: "Combo Picker – millions of random combinations",
  description: "Chain several lists together and spin one result from each, in sequence.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${flap.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
