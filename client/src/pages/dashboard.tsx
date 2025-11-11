import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Building2, LogOut, DollarSign, TrendingUp, FileText, Users, MapPin, Send, Eye, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/login-form";
import { KYCUpload } from "@/components/kyc-upload";
import { SignatureWorkflow } from "@/components/signature-workflow";
import { CoOwnerGrid } from "@/components/co-owner-grid";
import { InvestmentCalculator } from "@/components/investment-calculator";
import { ProcessTimeline } from "@/components/process-timeline";
import { DocumentsStation } from "@/components/documents-station";
import type { Investor, Property, PropertyReservation, CoOwnerSlot, InvestorSignature } from "@shared/schema";

interface ReservationWithDetails extends PropertyReservation {
  property: Property;
  slots: Array<CoOwnerSlot & { investorName?: string }>;
}

interface ReservationsResponse {
  reservations: ReservationWithDetails[];
}

export default function Dashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentInvestor, setCurrentInvestor] = useState<Investor | null>(null);
  const [, setLocation] = useLocation();

  const { data: pilotProperty } = useQuery<Property>({
    queryKey: ["/api/properties/pilot"],
    enabled: isAuthenticated,
  });

  const { data: reservationsData, isLoading: isLoadingReservations } = useQuery<ReservationsResponse>({
    queryKey: ["/api/reservations/investor"],
    enabled: isAuthenticated && !!currentInvestor,
  });

  const { data: signatures } = useQuery<InvestorSignature[]>({
    queryKey: ["/api/signatures/investor", currentInvestor?.id, "property", pilotProperty?.id],
    enabled: isAuthenticated && !!currentInvestor?.id && !!pilotProperty?.id,
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

  const handleExpressInterest = () => {
    // Navigate to express interest page with pilot property ID
    setLocation(`/properties/${pilotProperty?.id || 'cb8843d6-e4cf-404a-92b2-bd382e9c4853'}/express-interest`);
  };

  const handleViewReservationDetails = (reservationId: string) => {
    setLocation(`/reservations/${reservationId}`);
  };

  if (!isAuthenticated) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  const fractionPercentage = (currentInvestor?.fractionsPurchased || 0) * 25;
  const escrowProgress = pilotProperty ? (pilotProperty.fractionsSold / pilotProperty.totalFractions) * 100 : 0;
  const reservations = reservationsData?.reservations || [];

  // Helper: Get reservation status badge config
  const getReservationStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return { label: "Draft", className: "bg-muted text-muted-foreground" };
      case "invitations_sent":
        return { label: "Invitations Sent", className: "bg-amber-500 text-white" };
      case "all_signed":
        return { label: "All Signed", className: "bg-green-600 text-white" };
      case "payment_pending":
        return { label: "Payment Pending", className: "bg-primary text-primary-foreground" };
      case "payment_complete":
        return { label: "Completed", className: "bg-green-600 text-white" };
      case "cancelled":
        return { label: "Cancelled", className: "bg-destructive text-destructive-foreground" };
      default:
        return { label: status, className: "bg-muted text-muted-foreground" };
    }
  };

  // Helper: Get investor's slot from reservation
  const getMySlot = (reservation: ReservationWithDetails) => {
    return reservation.slots.find(slot => slot.investorId === currentInvestor?.id);
  };

  // Helper: Generate documents list for DocumentsStation
  const getDocumentsList = () => {
    if (!signatures || signatures.length === 0) {
      return [];
    }

    const docs = [
      {
        id: "co-ownership",
        name: "Co-Ownership Agreement",
        type: "co_ownership" as const,
        status: signatures.find(s => s.templateId === "co_ownership")
          ? "signed" as const
          : "not_started" as const,
        signedAt: signatures.find(s => s.templateId === "co_ownership")?.signedAt || undefined,
        downloadUrl: signatures.find(s => s.templateId === "co_ownership")
          ? `/api/documents/co-ownership.pdf`
          : undefined,
      },
      {
        id: "power-of-attorney",
        name: "Power of Attorney",
        type: "power_of_attorney" as const,
        status: signatures.find(s => s.templateId === "power_of_attorney")
          ? "signed" as const
          : "not_started" as const,
        signedAt: signatures.find(s => s.templateId === "power_of_attorney")?.signedAt || undefined,
        downloadUrl: signatures.find(s => s.templateId === "power_of_attorney")
          ? `/api/documents/power-of-attorney.pdf`
          : undefined,
      },
      {
        id: "jop-declaration",
        name: "JOP Declaration",
        type: "jop_declaration" as const,
        status: signatures.find(s => s.templateId === "jop_declaration")
          ? "signed" as const
          : "not_started" as const,
        signedAt: signatures.find(s => s.templateId === "jop_declaration")?.signedAt || undefined,
        downloadUrl: signatures.find(s => s.templateId === "jop_declaration")
          ? `/api/documents/jop-declaration.pdf`
          : undefined,
      },
    ];

    return docs;
  };

  // Helper: Get process timeline steps
  const getProcessSteps = () => {
    const hasReservation = reservations.length > 0;
    const hasSignedDocuments = signatures && signatures.length > 0;
    const hasCompletedPayment = currentInvestor?.paymentStatus === "completed";
    const hasKYCApproved = currentInvestor?.kycStatus === "approved";

    let currentStep = 1;
    if (hasReservation) currentStep = 2;
    if (hasSignedDocuments) currentStep = 3;
    if (hasKYCApproved) currentStep = 4;
    if (hasCompletedPayment) currentStep = 5;

    return {
      currentStep,
      steps: [
        {
          number: 1,
          title: "Express Interest",
          description: "Browse properties and create a co-ownership reservation",
          status: hasReservation ? ("completed" as const) : ("current" as const),
          completedAt: hasReservation ? new Date().toISOString() : undefined,
        },
        {
          number: 2,
          title: "Invite Co-Owners",
          description: "Send invitations to co-owners and finalize ownership shares",
          status: hasSignedDocuments
            ? ("completed" as const)
            : hasReservation
            ? ("current" as const)
            : ("upcoming" as const),
          completedAt: hasSignedDocuments ? new Date().toISOString() : undefined,
        },
        {
          number: 3,
          title: "Sign Documents",
          description: "Review and sign legal agreements for co-ownership",
          status: hasKYCApproved
            ? ("completed" as const)
            : hasSignedDocuments
            ? ("current" as const)
            : ("upcoming" as const),
          completedAt: hasKYCApproved ? new Date().toISOString() : undefined,
        },
        {
          number: 4,
          title: "Complete KYC & Payment",
          description: "Upload documents and complete payment to escrow",
          status: hasCompletedPayment
            ? ("completed" as const)
            : hasKYCApproved
            ? ("current" as const)
            : ("upcoming" as const),
          completedAt: hasCompletedPayment ? new Date().toISOString() : undefined,
        },
        {
          number: 5,
          title: "Title Deed Registration",
          description: "DLD registration and property handover",
          status: hasCompletedPayment ? ("current" as const) : ("upcoming" as const),
        },
      ],
    };
  };

  const processData = getProcessSteps();

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
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold font-serif mb-2">Investor Dashboard</h1>
            <p className="text-muted-foreground">Manage your fractional real estate investments</p>
          </div>
          <Button onClick={handleExpressInterest} size="lg" data-testid="button-express-interest">
            <Home className="h-4 w-4 mr-2" />
            Express Interest
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-fractions-owned">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
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
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
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

        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" data-testid="tab-overview">
              Overview
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              Documents
            </TabsTrigger>
            <TabsTrigger value="process" data-testid="tab-process">
              Process
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Reservations Section */}
            {isLoadingReservations ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    Loading reservations...
                  </div>
                </CardContent>
              </Card>
            ) : reservations.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold font-serif mb-2">Your Co-Ownership Reservations</h2>
                  <p className="text-muted-foreground">Active property reservations and co-owner details</p>
                </div>

                {reservations.map((reservation) => {
                  const mySlot = getMySlot(reservation);
                  const statusBadge = getReservationStatusBadge(reservation.reservationStatus);

                  return (
                    <Card key={reservation.id} data-testid={`card-reservation-${reservation.id}`}>
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1">
                            <CardTitle className="text-2xl font-serif">
                              {reservation.property.title}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {reservation.property.location}
                            </CardDescription>
                          </div>
                          <Badge className={statusBadge.className} data-testid={`badge-reservation-status-${reservation.id}`}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-4 pt-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Property Price</div>
                            <div className="text-lg font-bold tabular-nums">
                              AED {Number(reservation.property.totalPrice).toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Your Share</div>
                            <div className="text-lg font-bold tabular-nums">
                              {mySlot ? `${Number(mySlot.sharePercentage).toFixed(2)}%` : "N/A"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Co-Owners</div>
                            <div className="text-lg font-bold flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {reservation.slots.filter(s => s.investorId).length} / {reservation.totalSlotsReserved}
                            </div>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-8">
                        <div>
                          <h3 className="text-lg font-semibold mb-4">Co-Ownership Breakdown</h3>
                          <CoOwnerGrid slots={reservation.slots} readOnly />
                        </div>

                        {mySlot && (
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Your Investment</h3>
                            <InvestmentCalculator
                              propertyPrice={Number(reservation.property.totalPrice)}
                              estimatedMonthlyRent={0}
                              initialSharePercentage={Number(mySlot.sharePercentage)}
                              readOnly
                            />
                          </div>
                        )}
                      </CardContent>

                      <CardFooter className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          onClick={() => handleViewReservationDetails(reservation.id)}
                          data-testid={`button-view-details-${reservation.id}`}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {reservation.reservationStatus === "draft" && (
                          <Button
                            onClick={() => handleViewReservationDetails(reservation.id)}
                            data-testid={`button-send-invitations-${reservation.id}`}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Send Invitations
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <Home className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No Reservations Yet</h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Start your co-ownership journey by expressing interest in available properties
                      </p>
                      <Button onClick={handleExpressInterest} size="lg" data-testid="button-express-interest-empty">
                        <Home className="h-4 w-4 mr-2" />
                        Browse Properties
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* My Properties Section */}
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
                        <div className="flex items-start gap-4 p-4 rounded-lg border hover-elevate" data-testid="card-property-owned">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{pilotProperty?.title || "1BR JVC Apartment"}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{pilotProperty?.location || "Jumeirah Village Circle, Dubai"}</p>
                            <div className="flex flex-wrap gap-6 text-sm">
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
                        <Button onClick={handleExpressInterest} data-testid="button-browse-properties">
                          Browse Available Properties
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
                        <div className="h-3 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${escrowProgress}%` }}
                            data-testid="progress-escrow"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
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
          </TabsContent>

          <TabsContent value="documents" className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold font-serif mb-2">Legal Documents</h2>
              <p className="text-muted-foreground">Manage your co-ownership legal documents and KYC</p>
            </div>

            <DocumentsStation
              documents={getDocumentsList()}
              onPreviewSign={(documentId) => {
                console.log("Preview sign document:", documentId);
              }}
              onDownload={(documentId) => {
                console.log("Download document:", documentId);
              }}
            />

            <div className="grid lg:grid-cols-2 gap-8">
              <KYCUpload
                investorId={currentInvestor?.id || ""}
                currentDocuments={{
                  passportDocPath: currentInvestor?.passportDocPath,
                  proofOfAddressPath: currentInvestor?.proofOfAddressPath,
                  bankStatementPath: currentInvestor?.bankStatementPath,
                }}
              />

              <SignatureWorkflow
                investorId={currentInvestor?.id || ""}
                propertyId={pilotProperty?.id || ""}
              />
            </div>
          </TabsContent>

          <TabsContent value="process" className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold font-serif mb-2">Co-Ownership Process</h2>
              <p className="text-muted-foreground">Track your progress through the co-ownership journey</p>
            </div>

            <ProcessTimeline
              currentStep={processData.currentStep}
              steps={processData.steps}
            />

            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-xl font-serif">Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {processData.currentStep === 1 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Browse available properties and create a co-ownership reservation to get started.
                    </p>
                    <Button onClick={handleExpressInterest} className="w-full" data-testid="button-next-step">
                      <Home className="h-4 w-4 mr-2" />
                      Express Interest
                    </Button>
                  </>
                )}
                {processData.currentStep === 2 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Send invitations to your co-owners to finalize the ownership structure.
                    </p>
                    {reservations.length > 0 && (
                      <Button
                        onClick={() => handleViewReservationDetails(reservations[0].id)}
                        className="w-full"
                        data-testid="button-next-step"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Manage Invitations
                      </Button>
                    )}
                  </>
                )}
                {processData.currentStep === 3 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Review and sign the legal documents for your co-ownership.
                    </p>
                    <Button
                      onClick={() => document.querySelector('[data-testid="tab-documents"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
                      className="w-full"
                      data-testid="button-next-step"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Documents
                    </Button>
                  </>
                )}
                {processData.currentStep === 4 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Upload your KYC documents and complete payment to the escrow account.
                    </p>
                    <Button
                      onClick={() => document.querySelector('[data-testid="tab-documents"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}
                      className="w-full"
                      data-testid="button-next-step"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Complete KYC & Payment
                    </Button>
                  </>
                )}
                {processData.currentStep === 5 && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Your co-ownership is being processed. We'll notify you when the title deed is registered.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
