import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SWRProvider } from "./swr-provider";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Orbit Money | Stellar DeFi",
  description: "Next-gen orbital DeFi on Stellar Testnet. Swap AGT, provide liquidity, earn yield — fully on-chain via Soroban.",
  openGraph: {
    title: "Orbit Money",
    description: "Orbital DeFi on Stellar Testnet",
    url: "https://orbit-money.vercel.app",
    siteName: "Orbit Money",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Orbit Money",
    description: "Orbital DeFi on Stellar Testnet",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <SWRProvider>
            <Navbar />
            {children}
          </SWRProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
