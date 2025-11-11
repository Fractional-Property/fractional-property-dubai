import { Card, CardContent } from "@/components/ui/card";
import { User, Mail, Plus, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CoOwnerGridProps {
  slots: Array<{
    id: string;
    slotNumber: number;
    investorId?: string;
    investorName?: string;
    invitationStatus: 'reserved' | 'invited' | 'accepted' | 'declined';
    invitationEmail?: string;
    sharePercentage: string;
  }>;
  onInviteClick?: (slotNumber: number) => void;
  readOnly?: boolean;
}

export function CoOwnerGrid({ slots, onInviteClick, readOnly = false }: CoOwnerGridProps) {
  const getStatusConfig = (status: string, hasInvestor: boolean, hasEmail: boolean) => {
    if (status === 'reserved') {
      return {
        bgClass: 'bg-primary/10 dark:bg-primary/20',
        borderClass: 'border-primary',
        icon: User,
        iconBgClass: 'bg-primary/20 dark:bg-primary/30',
        iconColor: 'text-primary',
        label: 'Reserved',
      };
    } else if (status === 'invited') {
      return {
        bgClass: 'bg-amber-50 dark:bg-amber-950',
        borderClass: 'border-amber-500',
        icon: Mail,
        iconBgClass: 'bg-amber-100 dark:bg-amber-900',
        iconColor: 'text-amber-600 dark:text-amber-400',
        label: 'Invited',
      };
    } else if (status === 'accepted') {
      return {
        bgClass: 'bg-green-50 dark:bg-green-950',
        borderClass: 'border-green-500',
        icon: CheckCircle,
        iconBgClass: 'bg-green-100 dark:bg-green-900',
        iconColor: 'text-green-600 dark:text-green-400',
        label: 'Accepted',
      };
    } else {
      return {
        bgClass: 'bg-muted',
        borderClass: 'border-dashed border-muted-foreground/30',
        icon: Plus,
        iconBgClass: 'bg-muted-foreground/10',
        iconColor: 'text-muted-foreground',
        label: 'Available',
      };
    }
  };

  return (
    <div 
      className="grid grid-cols-1 md:grid-cols-2 gap-6"
      role="grid"
      aria-label="Co-owner slots"
    >
      {slots.map((slot) => {
        const hasInvestor = !!slot.investorId;
        const hasEmail = !!slot.invitationEmail;
        const config = getStatusConfig(slot.invitationStatus, hasInvestor, hasEmail);
        const Icon = config.icon;
        const isAvailable = slot.invitationStatus === 'declined' || 
                           (!hasInvestor && !hasEmail && slot.invitationStatus !== 'reserved' && slot.invitationStatus !== 'invited' && slot.invitationStatus !== 'accepted');
        const isInteractive = isAvailable && onInviteClick && !readOnly;

        const cardContent = (
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div 
                className={cn(
                  "p-4 rounded-full transition-colors",
                  config.iconBgClass
                )}
                aria-hidden="true"
              >
                <Icon className={cn("h-8 w-8", config.iconColor)} />
              </div>
              
              <div className="space-y-2 w-full">
                <div 
                  className="text-4xl font-bold tabular-nums"
                  data-testid={`text-percentage-${slot.slotNumber}`}
                >
                  {slot.sharePercentage}%
                </div>
                
                {slot.investorName && (
                  <div 
                    className="text-base font-medium"
                    data-testid={`text-investor-name-${slot.slotNumber}`}
                  >
                    {slot.investorName}
                  </div>
                )}
                
                {slot.invitationEmail && !slot.investorName && (
                  <div 
                    className="text-sm text-muted-foreground truncate max-w-full px-2"
                    data-testid={`text-invitation-email-${slot.slotNumber}`}
                    title={slot.invitationEmail}
                  >
                    {slot.invitationEmail}
                  </div>
                )}
                
                {isAvailable && (
                  <div 
                    className="text-sm text-muted-foreground font-medium"
                    data-testid={`text-available-${slot.slotNumber}`}
                  >
                    Invite Co-Owner
                  </div>
                )}
              </div>
              
              <div 
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wide",
                  config.bgClass,
                  config.iconColor
                )}
                data-testid={`badge-status-${slot.slotNumber}`}
              >
                {config.label}
              </div>
            </div>
          </CardContent>
        );

        if (isInteractive) {
          return (
            <button
              key={slot.id}
              onClick={() => onInviteClick?.(slot.slotNumber)}
              className={cn(
                "text-left w-full rounded-xl border bg-card text-card-foreground shadow-sm transition-all",
                "hover-elevate active-elevate-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                config.bgClass,
                config.borderClass
              )}
              data-testid={`button-invite-slot-${slot.slotNumber}`}
              aria-label={`Invite co-owner for slot ${slot.slotNumber} with ${slot.sharePercentage}% share`}
            >
              {cardContent}
            </button>
          );
        }

        return (
          <Card
            key={slot.id}
            className={cn(
              config.bgClass,
              config.borderClass
            )}
            data-testid={`card-slot-${slot.slotNumber}`}
            role="gridcell"
            aria-label={`Slot ${slot.slotNumber}: ${config.label}, ${slot.sharePercentage}% share${slot.investorName ? `, owned by ${slot.investorName}` : ''}${slot.invitationEmail && !slot.investorName ? `, invited ${slot.invitationEmail}` : ''}`}
          >
            {cardContent}
          </Card>
        );
      })}
    </div>
  );
}
