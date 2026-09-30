import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OGSOS Postgraduate Gold Medal Examination 2026",
  description: "Online examination portal for the OGSOS Postgraduate Gold Medal Examination 2026."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
