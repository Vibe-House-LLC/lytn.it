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
  title: "lytn.it - URL Shortener",
  description: "Lighten your URLs with lytn.it",
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
