import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { insertInvestorSchema, type InsertInvestor } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface ReservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReservationModal({ open, onOpenChange }: ReservationModalProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertInvestor>({
    resolver: zodResolver(insertInvestorSchema),
    defaultValues: {
      email: "",
      fullName: "",
      phone: "",
    },
  });

  const onSubmit = async (data: InsertInvestor) => {
    if (step === 1) {
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/investors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const error = await response.json();
          toast({
            title: "Registration Failed",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        setStep(2);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to register. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    setStep(1);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Reserve Your Fraction</DialogTitle>
          <DialogDescription>
            Complete the steps below to reserve your share in this property
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span>Step {step} of 3</span>
              <span className="text-muted-foreground">
                {step === 1 && "Personal Information"}
                {step === 2 && "KYC Documentation"}
                {step === 3 && "Payment"}
              </span>
            </div>
            <Progress value={(step / 3) * 100} className="h-2" />
          </div>

          <div className="flex justify-center gap-8 py-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span className="text-sm hidden sm:inline">Personal Info</span>
            </div>
            <div className="w-12 border-t-2 self-center" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {step > 2 ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <span className="text-sm hidden sm:inline">KYC</span>
            </div>
            <div className="w-12 border-t-2 self-center" />
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                3
              </div>
              <span className="text-sm hidden sm:inline">Payment</span>
            </div>
          </div>

          {step === 1 && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your full name" {...field} data-testid="input-fullname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="your@email.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input type="tel" placeholder="+971 50 123 4567" {...field} data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} data-testid="button-next-step1">
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                        Registering...
                      </>
                    ) : (
                      <>
                        Next: KYC Documentation
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-lg border p-6 space-y-4">
                <h3 className="font-semibold">KYC Documentation Required</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Valid passport or Emirates ID</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Proof of address (utility bill or bank statement, less than 3 months old)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>Signed Co-Ownership Agreement and Power of Attorney</span>
                  </li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-6">
                <p className="text-sm text-muted-foreground">
                  You will receive an email with document templates and upload instructions after completing your payment.
                </p>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleBack} data-testid="button-back-step2">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button onClick={() => setStep(3)} data-testid="button-next-step2">
                  Next: Payment
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="rounded-lg border p-6 space-y-4">
                <h3 className="font-semibold text-lg">Payment Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fraction Purchase (25%)</span>
                    <span className="font-medium tabular-nums">AED 225,000.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing Fee</span>
                    <span className="font-medium tabular-nums">AED 0.00</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold tabular-nums text-primary">AED 225,000.00</span>
                  </div>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-3">
                <h4 className="font-semibold text-sm">Developer Escrow Account</h4>
                <div className="font-mono text-sm bg-background p-3 rounded border">
                  AE07 0331 2345 6789 0123 456
                </div>
                <p className="text-xs text-muted-foreground">
                  Your payment will be held in the developer's DLD-registered escrow account until all fractions are sold.
                </p>
              </div>

              <Button className="w-full" size="lg" asChild data-testid="button-proceed-payment">
                <a href="/payment">
                  Proceed to Payment
                  <ChevronRight className="ml-2 h-5 w-5" />
                </a>
              </Button>

              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={handleBack} className="flex-1" data-testid="button-back-step3">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
