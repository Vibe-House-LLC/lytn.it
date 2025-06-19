import type { Metadata } from "next";
import { Dosis, Roboto_Condensed, Ubuntu, Ubuntu_Mono } from "next/font/google";
import "./globals.css";
import AmplifySetup from "@/utilities/amplifySetup";

const dosis = Dosis({
  variable: "--font-dosis",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-roboto-condensed",
  subsets: ["latin"],
  weight: ["400"],
});

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["400"],
});

const ubuntuMono = Ubuntu_Mono({
  variable: "--font-ubuntu-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "lytn.it  Link Shortener | Make a long link short.",
  description: "Heavy link? lytn.it -- A simple and effective link shortener. One of the shortest out there. Track clicks and referrals, add passwords, create custom links, and more.",
  keywords: "shortest, link shortener, lighten it, make a small link, shorten, password, protect, track, stats, analytics, clicks, temporary, private, a link, simple",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
    <AmplifySetup>
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" />
      </head>
      <body
        className={`${dosis.variable} ${robotoCondensed.variable} ${ubuntu.variable} ${ubuntuMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
    </AmplifySetup>
    </>
  );
}
