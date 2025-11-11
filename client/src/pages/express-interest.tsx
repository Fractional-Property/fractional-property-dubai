import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Users, AlertCircle, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InvestmentCalculator } from "@/components/investment-calculator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";
import buildingImage from "@assets/generated_images/JVC_building_exterior_view_c11476b3.png";

interface SlotData {
  slotNumber: number;
  sharePercentage: number;
  invitationEmail: string;
}

export default function ExpressInterest() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [numberOfCoOwners, setNumberOfCoOwners] = useState(2);
  const [slots, setSlots] = useState<SlotData[]>([
    { slotNumber: 1, sharePercentage: 50, invitationEmail: "" },
    { slotNumber: 2, sharePercentage: 50, invitationEmail: "" },
  ]);

  const { data: property, isLoading: isLoadingProperty } = useQuery<Property>({
    queryKey: ["/api/properties", propertyId],
    enabled: !!propertyId,
  });

  // Calculate if shares add up to 100%
  const totalShares = useMemo(() => {
    return slots.reduce((sum, slot) => sum + slot.sharePercentage, 0);
  }, [slots]);

  const isValidTotal = Math.abs(totalShares - 100) < 0.01;

  // Update slots when number of co-owners changes
  useEffect(() => {
    const equalShare = 100 / numberOfCoOwners;
    const newSlots: SlotData[] = [];

    for (let i = 1; i <= numberOfCoOwners; i++) {
      const existingSlot = slots.find(s => s.slotNumber === i);
      newSlots.push({
        slotNumber: i,
        sharePercentage: existingSlot?.sharePercentage || equalShare,
        invitationEmail: existingSlot?.invitationEmail || "",
      });
    }

    // Normalize to ensure they add up to 100%
    const total = newSlots.reduce((sum, s) => sum + s.sharePercentage, 0);
    if (Math.abs(total - 100) > 0.01) {
      const adjustment = (100 - total) / numberOfCoOwners;
      newSlots.forEach(slot => {
        slot.sharePercentage = Math.max(1, slot.sharePercentage + adjustment);
      });
    }

    setSlots(newSlots);
  }, [numberOfCoOwners]);

  const handleShareChange = (slotNumber: number, value: number[]) => {
    const newSlots = [...slots];
    const slotIndex = newSlots.findIndex(s => s.slotNumber === slotNumber);

    if (slotIndex !== -1) {
      const oldValue = newSlots[slotIndex].sharePercentage;
      const newValue = value[0];
      const diff = newValue - oldValue;

      newSlots[slotIndex].sharePercentage = newValue;

      // Distribute the difference among other slots
      const otherSlots = newSlots.filter((_, i) => i !== slotIndex);
      if (otherSlots.length > 0 && Math.abs(diff) > 0.01) {
        const adjustmentPerSlot = -diff / otherSlots.length;
        otherSlots.forEach(slot => {
          slot.sharePercentage = Math.max(1, Math.min(99, slot.sharePercentage + adjustmentPerSlot));
        });
      }

      setSlots(newSlots);
    }
  };

  const handleEmailChange = (slotNumber: number, email: string) => {
    const newSlots = [...slots];
    const slotIndex = newSlots.findIndex(s => s.slotNumber === slotNumber);
    if (slotIndex !== -1) {
      newSlots[slotIndex].invitationEmail = email;
      setSlots(newSlots);
    }
  };

  const createReservationMutation = useMutation({
    mutationFn: async (data: { propertyId: string; totalSlotsReserved: number; slots: Array<{ slotNumber: number; sharePercentage: number; invitationEmail?: string }> }) => {
      const response = await apiRequest("POST", "/api/reservations", data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations/investor"] });
      toast({
        title: "Reservation Created",
        description: "Your co-ownership reservation has been created successfully.",
      });
      navigate(`/reservations/${data.reservation.id}`);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create reservation. Please try again.",
      });
    },
  });

  const handleSubmit = () => {
    if (!isValidTotal) {
      toast({
        variant: "destructive",
        title: "Invalid Share Distribution",
        description: "Share percentages must add up to 100%.",
      });
      return;
    }

    const reservationData = {
      propertyId: propertyId!,
      totalSlotsReserved: numberOfCoOwners,
      slots: slots.map(slot => ({
        slotNumber: slot.slotNumber,
        sharePercentage: slot.sharePercentage,
        invitationEmail: slot.invitationEmail || undefined,
      })),
    };

    createReservationMutation.mutate(reservationData);
  };

  if (isLoadingProperty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Property Not Found</h1>
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-serif">FOPD</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </header>

      <main className="container py-12 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-serif mb-2">Express Your Interest</h1>
          <p className="text-muted-foreground text-lg">
            Reserve your share in this property and invite co-owners
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Property Details */}
          <div className="lg:col-span-1 space-y-6">
            <Card data-testid="card-property-details">
              <div className="aspect-[4/3] relative overflow-hidden rounded-t-xl">
                <img
                  src={buildingImage}
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardHeader>
                <CardTitle className="text-2xl font-serif" data-testid="text-property-title">
                  {property.title}
                </CardTitle>
                <CardDescription data-testid="text-property-location">
                  {property.location}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Property Price</span>
                    <span className="font-bold tabular-nums" data-testid="text-total-price">
                      AED {Number(property.totalPrice).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Per Fraction (25%)</span>
                    <span className="font-bold tabular-nums" data-testid="text-price-per-fraction">
                      AED {Number(property.pricePerFraction).toLocaleString()}
                    </span>
                  </div>
                  {property.bedrooms && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bedrooms</span>
                      <span className="font-medium">{property.bedrooms}</span>
                    </div>
                  )}
                  {property.area && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Area</span>
                      <span className="font-medium">{property.area} sq ft</span>
                    </div>
                  )}
                </div>

                {property.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">{property.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Share Allocation Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Number of Co-Owners Selector */}
            <Card data-testid="card-coowner-selector">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Number of Co-Owners
                </CardTitle>
                <CardDescription>
                  Select how many people will co-own this property (maximum 4)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-3">
                  {[1, 2, 3, 4].map((num) => (
                    <Button
                      key={num}
                      variant={numberOfCoOwners === num ? "default" : "outline"}
                      onClick={() => setNumberOfCoOwners(num)}
                      className="h-16 text-lg font-bold"
                      data-testid={`button-coowners-${num}`}
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Share Allocation */}
            <Card data-testid="card-share-allocation">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Share Allocation</CardTitle>
                    <CardDescription>
                      Adjust ownership percentages for each co-owner
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold tabular-nums" data-testid="text-total-percentage">
                      {totalShares.toFixed(2)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isValidTotal && (
                  <Alert variant="destructive" data-testid="alert-invalid-total">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Share percentages must total exactly 100%. Current total: {totalShares.toFixed(2)}%
                    </AlertDescription>
                  </Alert>
                )}

                {isValidTotal && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950" data-testid="alert-valid-total">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <AlertDescription className="text-green-600 dark:text-green-400">
                      Perfect! Shares add up to 100%
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-8">
                  {slots.map((slot, index) => (
                    <div key={slot.slotNumber} className="space-y-4 pb-6 border-b last:border-0">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">
                          {index === 0 ? "Your Share" : `Co-Owner ${index + 1}`}
                        </Label>
                        <div className="text-2xl font-bold tabular-nums text-primary" data-testid={`text-slot-${slot.slotNumber}-percentage`}>
                          {slot.sharePercentage.toFixed(2)}%
                        </div>
                      </div>

                      <Slider
                        min={1}
                        max={99}
                        step={0.01}
                        value={[slot.sharePercentage]}
                        onValueChange={(value) => handleShareChange(slot.slotNumber, value)}
                        className="w-full"
                        data-testid={`slider-slot-${slot.slotNumber}`}
                      />

                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1%</span>
                        <span>Investment: AED {(Number(property.totalPrice) * slot.sharePercentage / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        <span>99%</span>
                      </div>

                      {index > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor={`email-${slot.slotNumber}`}>
                            Email Address (Optional)
                          </Label>
                          <Input
                            id={`email-${slot.slotNumber}`}
                            type="email"
                            placeholder="co-owner@example.com"
                            value={slot.invitationEmail}
                            onChange={(e) => handleEmailChange(slot.slotNumber, e.target.value)}
                            data-testid={`input-email-${slot.slotNumber}`}
                          />
                          <p className="text-xs text-muted-foreground">
                            You can invite this co-owner now or send invitations later
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Investment Summary */}
            <Card data-testid="card-investment-summary">
              <CardHeader>
                <CardTitle>Your Investment Summary</CardTitle>
                <CardDescription>
                  Based on your selected {slots[0].sharePercentage.toFixed(2)}% share
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Your Share</div>
                    <div className="text-3xl font-bold tabular-nums" data-testid="text-your-share">
                      {slots[0].sharePercentage.toFixed(2)}%
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Investment Amount</div>
                    <div className="text-3xl font-bold tabular-nums text-primary" data-testid="text-investment-amount">
                      AED {(Number(property.totalPrice) * slots[0].sharePercentage / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={!isValidTotal || createReservationMutation.isPending}
                data-testid="button-create-reservation"
              >
                {createReservationMutation.isPending ? (
                  <>Creating Reservation...</>
                ) : (
                  <>
                    Create Reservation
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
