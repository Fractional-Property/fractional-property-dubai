import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Download, FileText, LogOut, DollarSign, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LoginForm } from "@/components/login-form";
import { KYCUpload } from "@/components/kyc-upload";
import type { Investor, Property } from "@shared/schema";

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentInvestor, setCurrentInvestor] = useState<Investor | null>(null);

  const { data: pilotProperty } = useQuery<Property>({
    queryKey: ["/api/properties/pilot"],
    enabled: isAuthenticated,
  });

  const handleLoginSuccess = (investor: Investor) => {
    setCurrentInvestor(investor);
    setIsAuthenticated(true);
    sessionStorage.setItem("investorData", JSON.stringify(investor));
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentInvestor(null);
  };

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const fractionPercentage = (currentInvestor?.fractionsPurchased || 0) * 25;
  const escrowProgress = pilotProperty ? (pilotProperty.fractionsSold / pilotProperty.totalFractions) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-serif">FOPD</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-muted-foreground">Welcome back</div>
              <div className="font-semibold">{currentInvestor?.fullName}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-serif mb-2">Investor Dashboard</h1>
          <p className="text-muted-foreground">Manage your fractional real estate investments</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-fractions-owned">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fractions Owned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-fractions-count">
                {currentInvestor?.fractionsPurchased || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {fractionPercentage}% ownership
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-total-invested">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="text-total-invested">
                AED {Number(currentInvestor?.totalInvested || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                in Dubai real estate
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-payment-status">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Status</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize" data-testid="text-payment-status">
                {currentInvestor?.paymentStatus || "Pending"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last updated today
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-kyc-status">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KYC Status</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize" data-testid="text-kyc-status">
                {currentInvestor?.kycStatus || "Pending"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Complete your documents
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif">My Properties</CardTitle>
                <CardDescription>Your fractional ownership portfolio</CardDescription>
              </CardHeader>
              <CardContent>
                {currentInvestor?.fractionsPurchased && currentInvestor.fractionsPurchased > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 rounded-lg border hover-elevate">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{pilotProperty?.title || "1BR JVC Apartment"}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{pilotProperty?.location || "Jumeirah Village Circle, Dubai"}</p>
                        <div className="flex gap-6 text-sm">
                          <div>
                            <span className="text-muted-foreground">Your Stake:</span>{" "}
                            <span className="font-semibold">{fractionPercentage}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Invested:</span>{" "}
                            <span className="font-semibold tabular-nums">AED {Number(currentInvestor.totalInvested).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">You haven't purchased any fractions yet</p>
                    <Button asChild>
                      <a href="/">Browse Available Properties</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-serif">Escrow Progress</CardTitle>
                <CardDescription>Funding status for your property</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Fractions Sold</span>
                      <span className="font-semibold tabular-nums">
                        {pilotProperty?.fractionsSold || 3} / {pilotProperty?.totalFractions || 4}
                      </span>
                    </div>
                    <Progress value={escrowProgress} className="h-3 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      {escrowProgress.toFixed(0)}% funded
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <h4 className="font-semibold text-sm">Developer Escrow Account</h4>
                    <div className="font-mono text-sm bg-background p-2 rounded border">
                      {pilotProperty?.escrowIban || "AE07 0331 2345 6789 0123 456"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      All co-owner payments are held securely until title deed registration
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <KYCUpload
              investorId={currentInvestor?.id || ""}
              currentDocuments={{
                passportDocPath: currentInvestor?.passportDocPath,
                proofOfAddressPath: currentInvestor?.proofOfAddressPath,
                bankStatementPath: currentInvestor?.bankStatementPath,
              }}
            />

            <Card data-testid="card-legal-documents">
              <CardHeader>
                <CardTitle className="text-xl font-serif">Legal Documents</CardTitle>
                <CardDescription>Download your co-ownership paperwork</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" data-testid="button-download-co-ownership">
                  <Download className="mr-2 h-4 w-4" />
                  Co-Ownership Agreement
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-download-poa-dashboard">
                  <Download className="mr-2 h-4 w-4" />
                  Power of Attorney (PoA)
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-download-kyc-form">
                  <Download className="mr-2 h-4 w-4" />
                  KYC/AML Form
                </Button>
                
                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    All documents are available in both English and Arabic
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl font-serif">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Have questions about your investment or the co-ownership process?
                </p>
                <Button variant="outline" className="w-full" data-testid="button-contact-support">
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
