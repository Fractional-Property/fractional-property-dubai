import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, ArrowLeft, Mail, Copy, CheckCircle, AlertCircle, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CoOwnerGrid } from "@/components/co-owner-grid";
import { ProcessTimeline } from "@/components/process-timeline";
import { DocumentsStation } from "@/components/documents-station";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";
import { format } from "date-fns";

interface Slot {
  id: string;
  slotNumber: number;
  investorId?: string;
  investorName?: string;
  invitationStatus: 'reserved' | 'invited' | 'accepted' | 'declined';
  invitationEmail?: string;
  sharePercentage: string;
}

interface Reservation {
  id: string;
  propertyId: string;
  initiatorInvestorId: string;
  reservationStatus: string;
  totalSlotsReserved: number;
  createdAt: string;
  updatedAt: string;
}

interface ReservationData {
  reservation: Reservation;
  property: Property;
  slots: Slot[];
  invitations?: Array<{
    id: string;
    slotId: string;
    invitedEmail: string;
    invitationToken: string;
    status: string;
    expiresAt: string;
  }>;
}

interface InvitationFormData {
  [slotId: string]: string;
}

export default function ReservationDetails() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [isInvitationDialogOpen, setIsInvitationDialogOpen] = useState(false);
  const [invitationEmails, setInvitationEmails] = useState<InvitationFormData>({});
  const [copiedLinks, setCopiedLinks] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery<ReservationData>({
    queryKey: ["/api/reservations", reservationId],
    enabled: !!reservationId,
  });

  const sendInvitationsMutation = useMutation({
    mutationFn: async (invitations: Array<{ slotId: string; invitedEmail: string }>) => {
      const response = await apiRequest("POST", `/api/reservations/${reservationId}/invite`, {
        invitations,
      });
      return await response.json();
    },
    onSuccess: (responseData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reservations", reservationId] });
      setIsInvitationDialogOpen(false);
      toast({
        title: "Invitations Sent",
        description: `Successfully sent ${responseData.invitations.length} invitation(s).`,
      });

      // Show invitation links in console for development
      if (responseData.invitations && responseData.invitations.length > 0) {
        console.log("Invitation Links (for development):");
        responseData.invitations.forEach((inv: any) => {
          console.log(`${inv.invitedEmail}: ${inv.invitationLink}`);
        });
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send invitations. Please try again.",
      });
    },
  });

  const handleSendInvitations = () => {
    if (!data) return;

    const invitations = Object.entries(invitationEmails)
      .filter(([, email]) => email.trim() !== "")
      .map(([slotId, email]) => ({
        slotId,
        invitedEmail: email.trim(),
      }));

    if (invitations.length === 0) {
      toast({
        variant: "destructive",
        title: "No Email Addresses",
        description: "Please enter at least one email address to send invitations.",
      });
      return;
    }

    sendInvitationsMutation.mutate(invitations);
  };

  const handleCopyLink = (link: string, email: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLinks(prev => new Set(prev).add(email));
    toast({
      title: "Link Copied",
      description: "Invitation link copied to clipboard.",
    });

    setTimeout(() => {
      setCopiedLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }, 2000);
  };

  const openInvitationDialog = () => {
    if (!data) return;

    // Pre-fill emails from slots
    const emails: InvitationFormData = {};
    data.slots.forEach(slot => {
      if (slot.slotNumber > 1 && slot.invitationEmail) {
        emails[slot.id] = slot.invitationEmail;
      }
    });
    setInvitationEmails(emails);
    setIsInvitationDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading reservation details...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Reservation Not Found</h1>
          <p className="text-muted-foreground mb-4">The reservation you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/")}>Return Home</Button>
        </div>
      </div>
    );
  }

  const { reservation, property, slots, invitations = [] } = data;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-amber-500';
      case 'invitations_sent':
        return 'bg-blue-500';
      case 'all_signed':
        return 'bg-green-500';
      case 'payment_pending':
        return 'bg-orange-500';
      case 'payment_complete':
        return 'bg-green-600';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getCurrentStep = () => {
    switch (reservation.reservationStatus) {
      case 'draft':
        return 1;
      case 'invitations_sent':
        return 2;
      case 'all_signed':
        return 3;
      case 'payment_pending':
        return 4;
      case 'payment_complete':
        return 5;
      default:
        return 1;
    }
  };

  const processSteps = [
    {
      number: 1,
      title: 'Express Interest',
      description: 'Reserve your share and allocate co-ownership percentages',
      status: getCurrentStep() > 1 ? 'completed' as const : 'current' as const,
      completedAt: reservation.createdAt,
    },
    {
      number: 2,
      title: 'Invite Co-Owners',
      description: 'Send invitation emails to your co-owners',
      status: getCurrentStep() > 2 ? 'completed' as const : getCurrentStep() === 2 ? 'current' as const : 'upcoming' as const,
    },
    {
      number: 3,
      title: 'Sign Documents',
      description: 'All co-owners sign the legal agreements',
      status: getCurrentStep() > 3 ? 'completed' as const : getCurrentStep() === 3 ? 'current' as const : 'upcoming' as const,
    },
    {
      number: 4,
      title: 'Payment & Transfer',
      description: 'Complete payment to escrow account',
      status: getCurrentStep() > 4 ? 'completed' as const : getCurrentStep() === 4 ? 'current' as const : 'upcoming' as const,
    },
    {
      number: 5,
      title: 'Title Deed Registration',
      description: 'DLD registers the co-ownership deed',
      status: getCurrentStep() >= 5 ? 'completed' as const : 'upcoming' as const,
    },
  ];

  const canSendInvitations = reservation.reservationStatus === 'draft';
  const slotsToInvite = slots.filter(slot => slot.slotNumber > 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-serif">FOPD</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="button-back-dashboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container py-12 max-w-7xl">
        {/* Reservation Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold font-serif mb-2">Reservation Details</h1>
              <p className="text-muted-foreground text-lg">
                {property.title} - {property.location}
              </p>
            </div>
            <Badge className={getStatusColor(reservation.reservationStatus)} data-testid="badge-reservation-status">
              {getStatusLabel(reservation.reservationStatus)}
            </Badge>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Created</div>
                    <div className="font-semibold" data-testid="text-created-date">
                      {format(new Date(reservation.createdAt), 'MMM dd, yyyy')}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Co-Owners</div>
                    <div className="font-semibold" data-testid="text-total-coowners">
                      {reservation.totalSlotsReserved}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-3/10">
                    <Building2 className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Property Value</div>
                    <div className="font-semibold tabular-nums" data-testid="text-property-value">
                      AED {Number(property.totalPrice).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Process Timeline */}
        <div className="mb-8">
          <ProcessTimeline currentStep={getCurrentStep()} steps={processSteps} />
        </div>

        {/* Co-Owner Grid */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-2xl font-serif">Co-Ownership Structure</CardTitle>
                  <CardDescription>
                    Share allocation and invitation status for each co-owner
                  </CardDescription>
                </div>
                {canSendInvitations && slotsToInvite.length > 0 && (
                  <Dialog open={isInvitationDialogOpen} onOpenChange={setIsInvitationDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={openInvitationDialog} data-testid="button-send-invitations">
                        <Mail className="mr-2 h-4 w-4" />
                        Send Invitations
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl" data-testid="dialog-send-invitations">
                      <DialogHeader>
                        <DialogTitle>Send Co-Owner Invitations</DialogTitle>
                        <DialogDescription>
                          Enter email addresses for each co-owner slot. They will receive an invitation link to join this property.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="space-y-6 py-4">
                        {slotsToInvite.map((slot) => (
                          <div key={slot.id} className="space-y-2">
                            <Label htmlFor={`invite-${slot.id}`}>
                              Co-Owner {slot.slotNumber} ({slot.sharePercentage}% share)
                            </Label>
                            <Input
                              id={`invite-${slot.id}`}
                              type="email"
                              placeholder="co-owner@example.com"
                              value={invitationEmails[slot.id] || slot.invitationEmail || ""}
                              onChange={(e) => setInvitationEmails(prev => ({
                                ...prev,
                                [slot.id]: e.target.value,
                              }))}
                              data-testid={`input-invite-email-${slot.slotNumber}`}
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button
                          variant="outline"
                          onClick={() => setIsInvitationDialogOpen(false)}
                          data-testid="button-cancel-invitations"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSendInvitations}
                          disabled={sendInvitationsMutation.isPending}
                          data-testid="button-confirm-send-invitations"
                        >
                          {sendInvitationsMutation.isPending ? "Sending..." : "Send Invitations"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CoOwnerGrid slots={slots} readOnly />
            </CardContent>
          </Card>
        </div>

        {/* Invitations List (Development/Testing) */}
        {invitations.length > 0 && (
          <div className="mb-8">
            <Alert data-testid="alert-invitation-links">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Invitation Links (Development Mode)</AlertTitle>
              <AlertDescription className="mt-2 space-y-2">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 p-2 rounded border bg-background">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{inv.invitedEmail}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {window.location.origin}/invitation/{inv.invitationToken}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyLink(`${window.location.origin}/invitation/${inv.invitationToken}`, inv.invitedEmail)}
                      data-testid={`button-copy-link-${inv.invitedEmail}`}
                    >
                      {copiedLinks.has(inv.invitedEmail) ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Documents Station (show when all signed) */}
        {reservation.reservationStatus === 'all_signed' || reservation.reservationStatus === 'payment_pending' || reservation.reservationStatus === 'payment_complete' ? (
          <div className="mb-8">
            <DocumentsStation
              documents={[
                {
                  id: '1',
                  name: 'Co-Ownership Agreement',
                  type: 'co_ownership',
                  status: 'signed',
                  signedAt: new Date().toISOString(),
                },
                {
                  id: '2',
                  name: 'Power of Attorney',
                  type: 'power_of_attorney',
                  status: 'signed',
                  signedAt: new Date().toISOString(),
                },
                {
                  id: '3',
                  name: 'Joint Ownership Declaration',
                  type: 'jop_declaration',
                  status: 'signed',
                  signedAt: new Date().toISOString(),
                },
              ]}
            />
          </div>
        ) : null}

        {/* Next Steps Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {reservation.reservationStatus === 'draft' && (
              <p className="text-sm text-muted-foreground">
                Send invitation emails to your co-owners so they can review and accept their share allocation.
              </p>
            )}
            {reservation.reservationStatus === 'invitations_sent' && (
              <p className="text-sm text-muted-foreground">
                Waiting for all co-owners to accept their invitations. Once everyone has accepted, you'll proceed to document signing.
              </p>
            )}
            {reservation.reservationStatus === 'all_signed' && (
              <p className="text-sm text-muted-foreground">
                All documents have been signed! Proceed to payment to complete the purchase.
              </p>
            )}
            {reservation.reservationStatus === 'payment_pending' && (
              <p className="text-sm text-muted-foreground">
                Complete the payment to the escrow account to finalize your co-ownership.
              </p>
            )}
            {reservation.reservationStatus === 'payment_complete' && (
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <p className="font-medium text-green-600 dark:text-green-400 mb-1">Payment Complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Your payment has been received. The property will be registered with DLD shortly.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
