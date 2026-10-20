import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://muza-decors.vercel.app"),
  title: "Muza Decors — Оралдағы мереке декоры, неон және ерекше сыйлықтар",
  description: "Muza Decors: Оралда фотозона мен мерекені безендіру, неон, көлемді жазулар және фото-холст. Қазақстан қалаларына бұйымдарды Қазпошта арқылы жіберуді келісіңіз.",
  openGraph: {
    title: "Muza Decors — Әр сәттің өз музасы бар",
    description: "Мерекені безендіру. Неон. Көлемді жазулар. Фото-холст. Орал, Қазақстан.",
    locale: "kk_KZ",
    type: "website",
    images: [{ url: "/images/muza-0.jpg", width: 360, height: 640, alt: "Muza Decors — изумруд реңкіндегі мереке декоры" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="kk"><body>{children}</body></html>;
}
