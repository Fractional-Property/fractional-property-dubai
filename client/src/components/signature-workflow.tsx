import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SignatureModal } from "@/components/signature-modal";
import type { AgreementTemplate } from "@shared/schema";

interface SignatureWorkflowProps {
  investorId: string;
}

type DocumentStep = {
  id: string;
  name: string;
  description: string;
  templateType: "co_ownership" | "power_of_attorney" | "jop_declaration";
  status: "pending" | "in_progress" | "completed";
};

export function SignatureWorkflow({ investorId }: SignatureWorkflowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AgreementTemplate | null>(null);
  
  const { data: templates = [] } = useQuery<AgreementTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const handleOpenSignature = (template: AgreementTemplate) => {
    setSelectedTemplate(template);
    setIsModalOpen(true);
  };

  const handleSignComplete = () => {
    // Move to next step - allow completion of all 3 steps
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
    setIsModalOpen(false);
    setSelectedTemplate(null);
  };

  // Define the signing workflow steps
  const steps: DocumentStep[] = [
    {
      id: "step-1",
      name: "Co-Ownership Agreement",
      description: "Define fractional ownership rights and obligations",
      templateType: "co_ownership",
      status: currentStep > 0 ? "completed" : currentStep === 0 ? "in_progress" : "pending",
    },
    {
      id: "step-2",
      name: "Power of Attorney",
      description: "Developer authorization for DLD processes",
      templateType: "power_of_attorney",
      status: currentStep > 1 ? "completed" : currentStep === 1 ? "in_progress" : "pending",
    },
    {
      id: "step-3",
      name: "JOP Declaration",
      description: "DLD Article 6 compliant declaration",
      templateType: "jop_declaration",
      status: currentStep > 2 ? "completed" : currentStep === 2 ? "in_progress" : "pending",
    },
  ];

  const progressPercentage = ((currentStep) / steps.length) * 100;
  const completedSteps = steps.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-2xl font-serif">Document Signing</CardTitle>
              <CardDescription>
                Complete all three legal documents to finalize your investment
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary" data-testid="text-steps-completed">
                {completedSteps}/{steps.length}
              </div>
              <p className="text-xs text-muted-foreground">Documents Signed</p>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" data-testid="progress-signature-workflow" />
        </CardHeader>
      </Card>

      {/* Step Cards */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const template = templates.find((t) => t.templateType === step.templateType);
          const isActive = currentStep === index;
          const isCompleted = step.status === "completed";
          const isPending = step.status === "pending";

          return (
            <Card
              key={step.id}
              className={`transition-all ${
                isActive ? "ring-2 ring-primary shadow-lg" : ""
              }`}
              data-testid={`card-signature-step-${index + 1}`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {isCompleted ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" data-testid={`icon-completed-${index + 1}`} />
                    ) : isActive ? (
                      <div className="h-6 w-6 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                        <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                      </div>
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">Step {index + 1}: {step.name}</h3>
                      {isCompleted && (
                        <Badge variant="default" className="bg-green-600">
                          Signed
                        </Badge>
                      )}
                      {isActive && (
                        <Badge variant="default">
                          In Progress
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
                    
                    {template && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>Version {template.version}</span>
                        {template.isActive && <span>• Active Template</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0">
                    {isActive && template && (
                      <Button
                        size="lg"
                        onClick={() => handleOpenSignature(template)}
                        data-testid={`button-sign-step-${index + 1}`}
                      >
                        Preview & Sign
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                    {isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: View signed document
                          console.log("View signed:", step.name);
                        }}
                        data-testid={`button-view-signed-${index + 1}`}
                      >
                        View Signed Document
                      </Button>
                    )}
                    {isPending && (
                      <Button variant="ghost" size="sm" disabled>
                        Locked
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              {isActive && template && (
                <CardContent className="pt-0">
                  <div className="bg-muted/30 rounded-lg p-4 border">
                    <h4 className="font-semibold mb-2 text-sm">Document Preview</h4>
                    <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto font-mono bg-background p-3 rounded">
                      {template.content.substring(0, 300)}...
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Click "Preview & Sign" to view the full document and add your signature
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedSteps === steps.length && (
        <Card className="border-green-600 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  All Documents Signed!
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  Your investment is ready for DLD registration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button size="lg" className="w-full" data-testid="button-download-all-documents">
              <FileText className="mr-2 h-4 w-4" />
              Download All Signed Documents
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Signature Modal */}
      {selectedTemplate && (
        <SignatureModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          template={selectedTemplate}
          investorId={investorId}
          propertyId="pilot-property-jvc-001"
          onSignComplete={handleSignComplete}
        />
      )}
    </div>
  );
}
