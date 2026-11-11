import React from "react";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import Showcase from "@/components/landing/Showcase";
import InstallVideos from "@/components/landing/InstallVideos";
import DemoVideos from "@/components/landing/DemoVideos";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <Showcase />
        <DemoVideos />
        <InstallVideos />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}