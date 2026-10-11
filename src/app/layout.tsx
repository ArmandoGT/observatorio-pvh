import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Header, Footer } from "@/components/Chrome";
import { observatory } from "@/lib/observatory";
import "./globals.css";
const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});
export const metadata: Metadata = {
  title: {
    default: observatory.name,
    template: `%s · ${observatory.name}`,
  },
  description: observatory.description,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={geist.variable}>
      <body>
        <a href="#conteudo" className="skip-link">
          Pular para o conteúdo
        </a>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
