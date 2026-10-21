import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rouie Media",
  description: "Fresh perspectives, bold ideas, and stories worth your time."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
