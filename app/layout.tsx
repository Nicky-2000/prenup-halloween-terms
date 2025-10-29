// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "The Prenup Agreement",
  description: "Add a term to the Halloween prenup — like the best ones!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
