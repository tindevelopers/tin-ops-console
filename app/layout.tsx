import localFont from "next/font/local";
import "./globals.css";
import { SidebarProvider } from "@tindevelopers/ui-shell/context/SidebarContext";
import { ThemeProvider } from "@tindevelopers/ui-shell/context/ThemeContext";

const outfit = localFont({
  src: "./fonts/outfit-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-outfit",
  display: "swap",
});

export const metadata = {
  title: "TIN Ops",
  description: "Status of TIN hubs, packages, cells and keys",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${outfit.className} bg-white dark:bg-gray-900`} suppressHydrationWarning>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
