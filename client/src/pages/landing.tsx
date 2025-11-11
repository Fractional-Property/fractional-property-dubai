import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Lock, FileCheck, Building2, Users, TrendingUp, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ReservationModal } from "@/components/reservation-modal";
import type { Property } from "@shared/schema";
import heroImage from "@assets/generated_images/Dubai_JVC_apartment_hero_image_7b4e97ad.png";
import buildingImage from "@assets/generated_images/JVC_building_exterior_view_c11476b3.png";
import bedroomImage from "@assets/generated_images/Bedroom_interior_Dubai_apartment_34062977.png";
import kitchenImage from "@assets/generated_images/Modern_Dubai_apartment_kitchen_241ad7e8.png";

export default function Landing() {
  const [isReservationOpen, setIsReservationOpen] = useState(false);

  const { data: pilotProperty } = useQuery<Property>({
    queryKey: ["/api/properties/pilot"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-serif">FOPD</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#pilot-unit" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pilot Unit
            </a>
            <a href="#legal" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Legal
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild data-testid="button-login">
              <a href="/dashboard">Investor Login</a>
            </Button>
            <Button size="sm" asChild data-testid="button-reserve-hero">
              <a href={pilotProperty ? `/properties/${pilotProperty.id}/express-interest` : "#"}>
                Reserve Your Share
              </a>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative min-h-[calc(100vh-5rem)] flex items-center">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Luxury Dubai apartment interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        </div>
        
        <div className="container relative z-10">
          <div className="max-w-3xl py-16 md:py-24">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-serif mb-6 leading-tight">
              Own 25% of a Dubai Apartment for{" "}
              <span className="text-primary">AED 225,000</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              DLD-compliant fractional co-ownership of off-plan real estate in Dubai. Direct title deed registration with up to 4 co-owners per property.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-12">
              <Button size="lg" asChild className="text-lg h-14 px-8" data-testid="button-reserve-cta">
                <a href={pilotProperty ? `/properties/${pilotProperty.id}/express-interest` : "#"}>
                  Reserve Your Share
                  <ChevronRight className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="text-lg h-14 px-8" asChild data-testid="button-view-pilot">
                <a href="#pilot-unit">View Pilot Unit</a>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3 bg-background/80 backdrop-blur rounded-lg p-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">DLD Compliant</div>
                  <div className="text-xs text-muted-foreground">Direct Registration</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-background/80 backdrop-blur rounded-lg p-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Lock className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Escrow Protected</div>
                  <div className="text-xs text-muted-foreground">Developer Account</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-background/80 backdrop-blur rounded-lg p-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-chart-3" />
                </div>
                <div>
                  <div className="font-semibold text-sm">No DFSA Required</div>
                  <div className="text-xs text-muted-foreground">Real Estate Co-Ownership</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pilot-unit" className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold font-serif mb-4">Pilot Unit Available Now</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              1-Bedroom Apartment in Jumeirah Village Circle
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <Card className="overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="relative aspect-[4/3]">
                  <img src={buildingImage} alt="JVC Building Exterior" className="w-full h-full object-cover" />
                </div>
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="mb-6">
                    <h3 className="text-3xl font-bold font-serif mb-2">1BR JVC Apartment</h3>
                    <p className="text-muted-foreground">Jumeirah Village Circle, Dubai</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div>
                      <div className="text-2xl font-bold tabular-nums">1</div>
                      <div className="text-sm text-muted-foreground">Bedroom</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">1</div>
                      <div className="text-sm text-muted-foreground">Bathroom</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold tabular-nums">650</div>
                      <div className="text-sm text-muted-foreground">sq ft</div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-baseline border-b pb-2">
                      <span className="text-muted-foreground">Total Property Value</span>
                      <span className="text-xl font-bold tabular-nums">AED 900,000</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b pb-2">
                      <span className="text-muted-foreground">Price per Fraction (25%)</span>
                      <span className="text-2xl font-bold tabular-nums text-primary">AED 225,000</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-muted-foreground">Available Fractions</span>
                      <span className="text-lg font-semibold tabular-nums">1 of 4</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Escrow Funding Progress</span>
                      <span className="font-semibold tabular-nums">3/4 Funded</span>
                    </div>
                    <Progress value={75} className="h-3" />
                  </div>

                  <Button size="lg" onClick={() => setIsReservationOpen(true)} className="w-full" data-testid="button-reserve-pilot">
                    Reserve Your Fraction
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-0 border-t">
                <div className="relative aspect-[4/3]">
                  <img src={bedroomImage} alt="Bedroom" className="w-full h-full object-cover" />
                </div>
                <div className="relative aspect-[4/3]">
                  <img src={kitchenImage} alt="Kitchen" className="w-full h-full object-cover" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold font-serif mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple, transparent process from reservation to ownership
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8">
            <Card className="p-8 hover-elevate">
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">1. Reserve Your Fraction</h3>
              <p className="text-muted-foreground leading-relaxed">
                Complete your registration and reserve your 25% fraction. Pay AED 225,000 securely through Tap Payments.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="w-16 h-16 rounded-lg bg-accent/10 flex items-center justify-center mb-6">
                <Lock className="h-8 w-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold mb-3">2. Escrow & KYC</h3>
              <p className="text-muted-foreground leading-relaxed">
                Your payment goes into the developer's DLD-registered escrow account. Complete KYC documentation.
              </p>
            </Card>

            <Card className="p-8 hover-elevate">
              <div className="w-16 h-16 rounded-lg bg-chart-3/10 flex items-center justify-center mb-6">
                <TrendingUp className="h-8 w-8 text-chart-3" />
              </div>
              <h3 className="text-xl font-bold mb-3">3. Direct Ownership</h3>
              <p className="text-muted-foreground leading-relaxed">
                Once all 4 fractions are sold, title deeds are registered directly with DLD in all co-owners' names.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section id="legal" className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <Card className="p-8 md:p-12 border-primary/20 bg-primary/5">
              <div className="flex items-start gap-4 mb-6">
                <FileCheck className="h-8 w-8 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-2xl font-bold mb-2">Legal Compliance Notice</h3>
                  <p className="text-lg leading-relaxed">
                    <strong>This is direct real estate co-ownership.</strong> Not a security. Not regulated by DFSA.
                  </p>
                </div>
              </div>
              
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  FOPD facilitates fractional co-ownership of off-plan real estate in Dubai, fully compliant with Dubai Land Department (DLD) regulations. Up to 4 co-owners can jointly own a single property with direct title deed registration—no Special Purpose Vehicle (SPV) or DFSA license required.
                </p>
                <p className="leading-relaxed">
                  All payments are held in the developer's DLD-registered escrow account. Legal documentation includes Co-Ownership Agreements, Irrevocable Power of Attorney, and KYC/AML compliance forms.
                </p>
              </div>

              <div className="mt-8 pt-8 border-t flex flex-wrap gap-4">
                <Button variant="outline" size="sm" data-testid="button-download-agreement">
                  <Download className="mr-2 h-4 w-4" />
                  Co-Ownership Agreement
                </Button>
                <Button variant="outline" size="sm" data-testid="button-download-poa">
                  <Download className="mr-2 h-4 w-4" />
                  Power of Attorney
                </Button>
                <Button variant="outline" size="sm" data-testid="button-download-kyc">
                  <Download className="mr-2 h-4 w-4" />
                  KYC Form
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold font-serif">FOPD</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2024 Fractional Off-Plan Dubai. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#legal" className="hover:text-foreground transition-colors">Legal</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      <ReservationModal open={isReservationOpen} onOpenChange={setIsReservationOpen} />
    </div>
  );
}
