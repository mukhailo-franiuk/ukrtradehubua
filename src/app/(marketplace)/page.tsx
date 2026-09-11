import Hero from "@/components/Hero";
import NewProducts from "@/components/NewProducts";

export default function Home() {
  return (
    <div className="overflow-x-hidden pb-16 text-gray-100 antialiased">
      <Hero />

      <NewProducts />
    </div>
  );
}