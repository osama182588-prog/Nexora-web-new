import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Showcase } from "@/components/landing/Showcase";
import { Pricing } from "@/components/landing/Pricing";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="relative">
      <LandingNav />
      <Hero />
      <Features />
      <Showcase />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </main>
  );
}
