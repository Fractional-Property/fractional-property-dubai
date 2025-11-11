import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface InvestmentCalculatorProps {
  propertyPrice: number;
  estimatedMonthlyRent?: number;
  initialSharePercentage?: number;
  onChange?: (sharePercentage: number, investmentAmount: number) => void;
  readOnly?: boolean;
}

export function InvestmentCalculator({
  propertyPrice,
  estimatedMonthlyRent = 0,
  initialSharePercentage = 25,
  onChange,
  readOnly = false,
}: InvestmentCalculatorProps) {
  const [sharePercentage, setSharePercentage] = useState(initialSharePercentage);
  const [debouncedPercentage, setDebouncedPercentage] = useState(initialSharePercentage);

  // Debounce the percentage change for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPercentage(sharePercentage);
    }, 100);

    return () => clearTimeout(timer);
  }, [sharePercentage]);

  // Notify parent component of changes
  useEffect(() => {
    if (onChange) {
      const investmentAmount = propertyPrice * (debouncedPercentage / 100);
      onChange(debouncedPercentage, investmentAmount);
    }
  }, [debouncedPercentage, propertyPrice, onChange]);

  const handleSliderChange = useCallback((value: number[]) => {
    if (!readOnly) {
      setSharePercentage(value[0]);
    }
  }, [readOnly]);

  // Currency formatter for AED
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AE", {
      style: "currency",
      currency: "AED",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate metrics using debounced percentage for smoother display
  const investmentAmount = propertyPrice * (debouncedPercentage / 100);
  const monthlyRent = estimatedMonthlyRent * (debouncedPercentage / 100);
  const annualRent = monthlyRent * 12;
  const annualROI = investmentAmount > 0 ? (annualRent / investmentAmount) * 100 : 0;
  const breakEvenYears = annualRent > 0 ? investmentAmount / annualRent : 0;

  return (
    <Card className="w-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-serif">Investment Calculator</CardTitle>
        <p className="text-sm text-muted-foreground">
          Adjust your share percentage to see investment details
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Share Percentage Slider */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <label
                htmlFor="share-slider"
                className="text-sm font-medium text-foreground"
              >
                Share Percentage
              </label>
              <p className="text-xs text-muted-foreground mt-1">
                Select between 1% and 100%
              </p>
            </div>
            <div
              className="text-4xl font-bold tabular-nums text-primary"
              data-testid="text-share-percentage"
            >
              {sharePercentage.toFixed(2)}%
            </div>
          </div>

          <Slider
            id="share-slider"
            min={1}
            max={100}
            step={0.01}
            value={[sharePercentage]}
            onValueChange={handleSliderChange}
            disabled={readOnly}
            className="w-full"
            data-testid="slider-share-percentage"
          />

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Property Price Display */}
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="text-sm text-muted-foreground mb-1">Property Price</div>
          <div
            className="text-2xl font-bold tabular-nums"
            data-testid="text-property-price"
          >
            {formatCurrency(propertyPrice)}
          </div>
        </div>

        {/* Investment Metrics Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Your Investment */}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Your Investment
            </div>
            <div
              className="text-3xl font-bold tabular-nums text-foreground"
              data-testid="text-investment-amount"
            >
              {formatCurrency(investmentAmount)}
            </div>
          </div>

          {/* Monthly Rent Estimate */}
          <div className="rounded-lg border bg-card p-4 space-y-2">
            <div className="text-sm font-medium text-muted-foreground">
              Monthly Rent Estimate
            </div>
            <div
              className="text-3xl font-bold tabular-nums text-foreground"
              data-testid="text-monthly-rent"
            >
              {formatCurrency(monthlyRent)}
            </div>
            {estimatedMonthlyRent === 0 && (
              <p className="text-xs text-muted-foreground">
                No rent data available
              </p>
            )}
          </div>

          {/* Annual ROI */}
          <div
            className={cn(
              "rounded-lg border p-4 space-y-2",
              annualROI > 0 ? "bg-green-500/10 border-green-500/30" : "bg-card"
            )}
          >
            <div className="text-sm font-medium text-muted-foreground">
              Annual ROI
            </div>
            <div
              className={cn(
                "text-3xl font-bold tabular-nums",
                annualROI > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}
              data-testid="text-annual-roi"
            >
              {annualROI.toFixed(2)}%
            </div>
            {estimatedMonthlyRent === 0 && (
              <p className="text-xs text-muted-foreground">
                Requires rent data
              </p>
            )}
          </div>

          {/* Break-even Timeline */}
          <div
            className={cn(
              "rounded-lg border p-4 space-y-2",
              breakEvenYears > 0 && breakEvenYears <= 20
                ? "bg-amber-500/10 border-amber-500/30"
                : "bg-card"
            )}
          >
            <div className="text-sm font-medium text-muted-foreground">
              Break-even Timeline
            </div>
            <div
              className={cn(
                "text-3xl font-bold tabular-nums",
                breakEvenYears > 0 && breakEvenYears <= 20
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-foreground"
              )}
              data-testid="text-breakeven-years"
            >
              {breakEvenYears > 0 && breakEvenYears < 1000
                ? `${breakEvenYears.toFixed(1)} yrs`
                : "—"}
            </div>
            {estimatedMonthlyRent === 0 && (
              <p className="text-xs text-muted-foreground">
                Requires rent data
              </p>
            )}
          </div>
        </div>

        {/* Summary */}
        {estimatedMonthlyRent > 0 && (
          <div className="rounded-lg bg-muted/30 p-4 space-y-2">
            <div className="text-sm font-medium">Investment Summary</div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              With a <span className="font-semibold text-foreground">{sharePercentage.toFixed(2)}%</span> share,
              you'll invest{" "}
              <span className="font-semibold text-foreground">{formatCurrency(investmentAmount)}</span> and
              receive approximately{" "}
              <span className="font-semibold text-foreground">{formatCurrency(monthlyRent)}</span> in
              monthly rental income, generating an annual return of{" "}
              <span className={cn(
                "font-semibold",
                annualROI > 0 ? "text-green-600 dark:text-green-400" : "text-foreground"
              )}>
                {annualROI.toFixed(2)}%
              </span>.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
