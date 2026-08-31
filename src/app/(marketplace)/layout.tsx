import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-[#f3f4f6]">
      <Header />

      <main className="min-h-[calc(100vh-100px)]">
        {children}
      </main>
      <Footer />
    </div>
  );
}