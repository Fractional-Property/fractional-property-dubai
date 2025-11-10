import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Building2, CreditCard, Shield, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Property } from "@shared/schema";

export default function Payment() {
  const [, setLocation] = useLocation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [tapLoaded, setTapLoaded] = useState(false);

  const { data: pilotProperty } = useQuery<Property>({
    queryKey: ["/api/properties/pilot"],
  });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://goSellJSLib.b-cdn.net/v2.0.0/js/gosell.js";
    script.async = true;
    script.onload = () => {
      setTapLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (tapLoaded && pilotProperty) {
      initializeTapPayment();
    }
  }, [tapLoaded, pilotProperty]);

  const initializeTapPayment = () => {
    if (!(window as any).goSell || !pilotProperty) return;

    const investorData = JSON.parse(sessionStorage.getItem("investorData") || "{}");

    if (!investorData.id) {
      console.error("No investor data found in session");
      return;
    }

    (window as any).goSell.config({
      gateway: {
        publicKey: import.meta.env.VITE_TAP_PUBLIC_KEY,
        language: "en",
        contactInfo: true,
        supportedCurrencies: "AED",
        supportedPaymentMethods: "all",
        saveCardOption: false,
        customerCards: false,
        notifications: "standard",
        callback: async (response: any) => {
          if (response.status === "CAPTURED") {
            try {
              if (!investorData.id || !pilotProperty?.id) {
                console.error("Missing investor or property ID for webhook");
                setPaymentStatus("error");
                return;
              }

              const webhookPayload = {
                id: response.id,
                status: "CAPTURED",
                amount: response.amount,
                source: response.source,
                metadata: {
                  investorId: investorData.id,
                  propertyId: pilotProperty.id,
                },
              };

              await fetch("/api/tap-payment/webhook", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(webhookPayload),
              });

              setPaymentStatus("success");
              setTimeout(() => {
                setLocation("/dashboard");
              }, 3000);
            } catch (error) {
              console.error("Webhook processing error:", error);
              setPaymentStatus("success");
              setTimeout(() => {
                setLocation("/dashboard");
              }, 3000);
            }
          } else if (response.status === "FAILED") {
            setPaymentStatus("error");
          }
        },
        onClose: () => {
          console.log("Payment popup closed");
        },
      },
      customer: {
        first_name: investorData.fullName?.split(" ")[0] || "Investor",
        last_name: investorData.fullName?.split(" ").slice(1).join(" ") || "Name",
        email: investorData.email || "investor@example.com",
        phone: {
          country_code: "+971",
          number: investorData.phone?.replace(/\D/g, "").slice(-9) || "501234567",
        },
      },
      order: {
        amount: 225000,
        currency: "AED",
        items: [
          {
            id: 1,
            name: "25% Fraction - 1BR JVC Apartment",
            description: "Fractional co-ownership of off-plan apartment in Dubai JVC",
            quantity: 1,
            amount_per_unit: 225000,
            total_amount: 225000,
          },
        ],
      },
      transaction: {
        mode: "charge",
        charge: {
          saveCard: false,
          threeDSecure: true,
          description: "FOPD Fractional Ownership Purchase",
          statement_descriptor: "FOPD Fraction",
          reference: {
            transaction: "txn_" + Date.now(),
            order: "ord_" + Date.now(),
          },
          receipt: {
            email: true,
            sms: true,
          },
          redirect: window.location.origin + "/dashboard",
          post: null,
        },
      },
    });
  };

  const handlePayNow = () => {
    if ((window as any).goSell) {
      setIsProcessing(true);
      setPaymentStatus("processing");
      (window as any).goSell.openLightBox();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-serif">FOPD</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Secure Payment</span>
          </div>
        </div>
      </header>

      <main className="container py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-serif mb-2">Complete Your Purchase</h1>
          <p className="text-muted-foreground">Secure your 25% fraction of the Dubai apartment</p>
        </div>

        {paymentStatus === "success" && (
          <Alert className="mb-8 border-green-500 bg-green-50 dark:bg-green-950">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Payment successful! Redirecting to your dashboard...
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === "error" && (
          <Alert className="mb-8" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Payment failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Payment Summary</CardTitle>
                <CardDescription>Review your purchase details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 rounded-lg border">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">1BR JVC Apartment - 25% Fraction</h3>
                      <p className="text-sm text-muted-foreground mb-2">Jumeirah Village Circle, Dubai</p>
                      <div className="flex gap-4 text-sm">
                        <span className="text-muted-foreground">Fraction Size: <strong className="text-foreground">25%</strong></span>
                        <span className="text-muted-foreground">Property Value: <strong className="text-foreground tabular-nums">AED 900,000</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fraction Purchase (25%)</span>
                      <span className="font-medium tabular-nums">AED 225,000.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing Fee</span>
                      <span className="font-medium tabular-nums">AED 0.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">DLD Registration Fee</span>
                      <span className="font-medium tabular-nums text-xs">(Paid at completion)</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between">
                      <span className="font-semibold text-lg">Total Due Today</span>
                      <span className="text-3xl font-bold tabular-nums text-primary">AED 90,000.00</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Button
                    size="lg"
                    className="w-full text-lg h-14"
                    onClick={handlePayNow}
                    disabled={!tapLoaded || isProcessing || paymentStatus === "success"}
                    data-testid="button-pay-now"
                  >
                    {!tapLoaded ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Loading Payment System...
                      </>
                    ) : isProcessing ? (
                      <>
                        <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Processing...
                      </>
                    ) : paymentStatus === "success" ? (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Payment Successful
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Pay with Tap Payments
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Powered by Tap Payments - Secure payment processing
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">Escrow Protection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm">Your payment is held in the developer's DLD-registered escrow account</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm">Funds released only upon title deed registration</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm">Full refund if all fractions not sold</p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold text-sm mb-2">Developer Escrow IBAN</h4>
                  <div className="font-mono text-xs bg-muted p-3 rounded border break-all">
                    AE07 0331 2345 6789 0123 456
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl font-serif">Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Payment Confirmation</p>
                      <p className="text-xs text-muted-foreground">Instant email confirmation</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Complete KYC</p>
                      <p className="text-xs text-muted-foreground">Submit required documents</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Title Deed Registration</p>
                      <p className="text-xs text-muted-foreground">When all 10 fractions sold</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">DLD Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  This is direct real estate co-ownership. Not a security. Not regulated by DFSA. All transactions comply with Dubai Land Department regulations.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
