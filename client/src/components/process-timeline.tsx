import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Edit3, Landmark, FileCheck, Home, Coins, CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { format } from "date-fns";

interface ProcessStep {
  number: number;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  completedAt?: string;
}

interface ProcessTimelineProps {
  currentStep: number;
  steps: ProcessStep[];
  compact?: boolean;
}

const stepIcons = {
  1: Edit3,
  2: Landmark,
  3: FileCheck,
  4: Home,
  5: Coins,
};

export function ProcessTimeline({ currentStep, steps, compact = false }: ProcessTimelineProps) {
  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  const getStepConfig = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return {
          bgClass: 'bg-green-500',
          borderClass: 'border-green-500',
          iconColor: 'text-white',
          lineClass: 'bg-green-500',
          textColor: 'text-green-600 dark:text-green-400',
          StatusIcon: CheckCircle,
        };
      case 'current':
        return {
          bgClass: 'bg-primary',
          borderClass: 'border-primary',
          iconColor: 'text-white',
          lineClass: 'bg-border',
          textColor: 'text-primary',
          StatusIcon: Circle,
        };
      case 'upcoming':
        return {
          bgClass: 'bg-muted',
          borderClass: 'border-muted-foreground/30',
          iconColor: 'text-muted-foreground',
          lineClass: 'bg-border',
          textColor: 'text-muted-foreground',
          StatusIcon: Circle,
        };
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className={cn("space-y-4", compact ? "p-4" : "p-6")}>
        <div className="space-y-2">
          <CardTitle className={cn(compact ? "text-xl" : "text-2xl", "font-serif")}>
            Co-Ownership Journey
          </CardTitle>
          <div className="flex items-center justify-between">
            <p className={cn("text-sm text-muted-foreground", compact && "text-xs")}>
              Step {currentStep} of {steps.length} - {progressPercentage.toFixed(0)}% Complete
            </p>
            <div
              className="text-sm font-medium text-primary"
              data-testid="text-progress-percentage"
            >
              {progressPercentage.toFixed(0)}%
            </div>
          </div>
        </div>
        <Progress
          value={progressPercentage}
          className="h-2"
          data-testid="progress-timeline"
        />
      </CardHeader>

      <CardContent className={cn(compact ? "p-4 pt-0" : "p-6 pt-0")}>
        <div className="space-y-0">
          {steps.map((step, index) => {
            const config = getStepConfig(step.status);
            const Icon = stepIcons[step.number as keyof typeof stepIcons];
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.number}
                className="relative"
                data-testid={`step-${step.number}`}
              >
                <div className="flex gap-4">
                  {/* Icon Column */}
                  <div className="flex flex-col items-center">
                    {/* Step Icon */}
                    <motion.div
                      className={cn(
                        "relative z-10 flex items-center justify-center rounded-full border-2",
                        compact ? "h-10 w-10" : "h-12 w-12",
                        config.bgClass,
                        config.borderClass
                      )}
                      animate={
                        step.status === 'current'
                          ? {
                              boxShadow: [
                                '0 0 0 0 rgba(59, 130, 246, 0.4)',
                                '0 0 0 8px rgba(59, 130, 246, 0)',
                                '0 0 0 0 rgba(59, 130, 246, 0)',
                              ],
                            }
                          : {}
                      }
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatType: 'loop',
                      }}
                      data-testid={`icon-step-${step.number}`}
                    >
                      {step.status === 'completed' ? (
                        <CheckCircle className={cn(compact ? "h-5 w-5" : "h-6 w-6", "text-white")} />
                      ) : (
                        <Icon className={cn(compact ? "h-4 w-4" : "h-5 w-5", config.iconColor)} />
                      )}
                    </motion.div>

                    {/* Connector Line */}
                    {!isLast && (
                      <div
                        className={cn(
                          "w-0.5 flex-1",
                          compact ? "min-h-12" : "min-h-16",
                          step.status === 'completed' ? 'bg-green-500' : 'bg-border',
                          step.status === 'upcoming' && 'border-l-2 border-dashed border-muted-foreground/30 bg-transparent'
                        )}
                        data-testid={`connector-${step.number}`}
                      />
                    )}
                  </div>

                  {/* Content Column */}
                  <div className={cn("flex-1", compact ? "pb-8" : "pb-12", isLast && "pb-0")}>
                    <div className="space-y-1">
                      {/* Step Number Badge */}
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold",
                            step.status === 'completed' && "bg-green-500/20 text-green-600 dark:text-green-400",
                            step.status === 'current' && "bg-primary/20 text-primary",
                            step.status === 'upcoming' && "bg-muted text-muted-foreground"
                          )}
                          data-testid={`badge-step-${step.number}`}
                        >
                          Step {step.number}
                        </div>
                        {step.completedAt && (
                          <div
                            className="text-xs text-muted-foreground"
                            data-testid={`date-completed-${step.number}`}
                          >
                            {format(new Date(step.completedAt), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>

                      {/* Step Title */}
                      <h3
                        className={cn(
                          "font-semibold",
                          compact ? "text-base" : "text-lg",
                          config.textColor
                        )}
                        data-testid={`title-step-${step.number}`}
                      >
                        {step.title}
                      </h3>

                      {/* Step Description */}
                      <p
                        className={cn(
                          "text-sm leading-relaxed",
                          step.status === 'completed' && "text-muted-foreground",
                          step.status === 'current' && "text-foreground",
                          step.status === 'upcoming' && "text-muted-foreground"
                        )}
                        data-testid={`description-step-${step.number}`}
                      >
                        {step.description}
                      </p>

                      {/* Current Step Indicator */}
                      {step.status === 'current' && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                          data-testid={`badge-current-${step.number}`}
                        >
                          <motion.div
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                            animate={{
                              scale: [1, 1.3, 1],
                              opacity: [1, 0.7, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              repeatType: 'loop',
                            }}
                          />
                          In Progress
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
