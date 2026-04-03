import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Snackbar from "./components/snakbar";
import { AuthProvider } from './context/AuthContext';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CareCrew360",
  description: "CareCrew360",
  icons: {
    icon: "/CC360 logo.png", // path inside /public
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
          <Snackbar />
        </AuthProvider>
      </body>
    </html>
  );
}
