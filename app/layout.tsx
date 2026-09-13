import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import Providers from "@/components/Providers";

export const metadata = {
  title: "YAMA AI",
  description: "El socio creativo para emprendedores y creadores",
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
        <PwaRegister />
      </body>
    </html>
  );
}
