import { HeroSection } from "@/components/marketing/hero-section";
import { CategorySection } from "@/components/marketing/category-section";
import { MarqueeBanner } from "@/components/marketing/marquee-banner";
import { SecretCollectionSection } from "@/components/marketing/secret-collection-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategorySection />
      <MarqueeBanner />
      <SecretCollectionSection />
    </>
  );
}
