import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Mail, KeyRound } from "lucide-react";
import { loginSchema, verifyOtpSchema, type Investor } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { z } from "zod";

interface LoginFormProps {
  onLoginSuccess: (investor: Investor) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");

  const handleDemoMode = () => {
    const demoInvestor: Investor = {
      id: "demo-investor-id",
      email: "demo@fopd.ae",
      fullName: "Demo Investor",
      phone: "+971501234567",
      kycStatus: "pending",
      paymentStatus: "pending",
      fractionsPurchased: 0,
      totalInvested: "0",
      passportDocPath: null,
      proofOfAddressPath: null,
      bankStatementPath: null,
      documentsUploadedAt: null,
      createdAt: new Date(),
    };
    onLoginSuccess(demoInvestor);
  };

  const emailForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
    },
  });

  const otpForm = useForm<z.infer<typeof verifyOtpSchema>>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      email: "",
      otp: "",
    },
  });

  const onEmailSubmit = async (data: z.infer<typeof loginSchema>) => {
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        emailForm.setError("email", { message: error.message });
        return;
      }

      setEmail(data.email);
      setStep("otp");
      otpForm.setValue("email", data.email);
    } catch (error: any) {
      emailForm.setError("email", { message: "Failed to send OTP" });
    }
  };

  const onOtpSubmit = async (data: z.infer<typeof verifyOtpSchema>) => {
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        otpForm.setError("otp", { message: error.message });
        return;
      }

      const { investor } = await response.json();
      onLoginSuccess(investor);
    } catch (error: any) {
      otpForm.setError("otp", { message: "Failed to verify OTP" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-serif">Investor Login</CardTitle>
          <CardDescription>
            {step === "email" ? "Enter your email to receive a login code" : "Enter the 6-digit code sent to your email"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-6">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="email"
                            placeholder="your@email.com"
                            className="pl-10"
                            {...field}
                            data-testid="input-login-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" data-testid="button-send-otp">
                  Send Login Code
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  size="lg"
                  onClick={handleDemoMode}
                  data-testid="button-demo-mode"
                >
                  View Demo Dashboard
                </Button>

                <div className="text-center">
                  <Button variant="ghost" size="sm" asChild data-testid="link-back-home">
                    <a href="/">← Back to Home</a>
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...otpForm}>
              <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg mb-4">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{email}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Code sent! Check your inbox and spam folder.
                  </p>
                </div>

                <FormField
                  control={otpForm.control}
                  name="otp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-center block">Enter 6-Digit Code</FormLabel>
                      <FormControl>
                        <div className="flex justify-center">
                          <InputOTP maxLength={6} {...field} data-testid="input-otp">
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" size="lg" data-testid="button-verify-otp">
                  <KeyRound className="mr-2 h-4 w-4" />
                  Verify & Login
                </Button>

                <div className="text-center space-y-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep("email")} data-testid="button-change-email">
                    Use Different Email
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Didn't receive code?{" "}
                    <button className="text-primary hover:underline" data-testid="button-resend-code">
                      Resend
                    </button>
                  </p>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
