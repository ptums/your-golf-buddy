export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans bg-amber-50 text-slate-950">{children}</body>
    </html>
  );
}
