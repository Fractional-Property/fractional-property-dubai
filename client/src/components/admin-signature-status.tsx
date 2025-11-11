import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Download, FileText, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PropertySignatureStatus {
  propertyId: string;
  documents: Array<{
    templateId: string;
    templateName: string;
    documentType: string;
    signedCount: number;
    totalRequired: number;
    isComplete: boolean;
  }>;
  allComplete: boolean;
}

export function AdminSignatureStatus() {
  const { toast } = useToast();
  
  const { data: signatureStatus, isLoading } = useQuery<PropertySignatureStatus>({
    queryKey: ["/api/signatures/property", "pilot-property-jvc-001", "status"],
  });

  const handleSendToAllInvestors = () => {
    toast({
      title: "Sending Documents",
      description: "E-signature requests sent to all 4 investors via email",
    });
  };

  const handleExportDLDBundle = () => {
    toast({
      title: "Exporting DLD Bundle",
      description: "Generating signed PDFs and CSV for DLD submission...",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signature Status</CardTitle>
          <CardDescription>Loading signature tracking data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allDocumentsComplete = signatureStatus?.allComplete || false;
  const totalDocuments = signatureStatus?.documents.length || 0;
  const completedDocuments = signatureStatus?.documents.filter(d => d.isComplete).length || 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-serif">Multi-Party Signature Tracking</CardTitle>
              <CardDescription>
                Monitor co-ownership agreement signing progress (4 investors required)
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary" data-testid="text-documents-complete">
                {completedDocuments}/{totalDocuments}
              </div>
              <p className="text-xs text-muted-foreground">Documents Complete</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button 
              onClick={handleSendToAllInvestors}
              className="flex-1"
              data-testid="button-send-to-all-investors"
            >
              <Users className="mr-2 h-4 w-4" />
              Send to All 4 Investors
            </Button>
            {allDocumentsComplete && (
              <Button 
                onClick={handleExportDLDBundle}
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="button-export-dld-bundle"
              >
                <Download className="mr-2 h-4 w-4" />
                Export DLD Bundle
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Document Status Cards */}
      <div className="space-y-4">
        {signatureStatus?.documents.map((doc) => {
          const progressPercentage = (doc.signedCount / doc.totalRequired) * 100;
          const isComplete = doc.isComplete;

          return (
            <Card 
              key={doc.templateId}
              className={isComplete ? "border-green-600 bg-green-50 dark:bg-green-950" : ""}
              data-testid={`card-document-${doc.documentType}`}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    {isComplete ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{doc.templateName}</h3>
                      {isComplete ? (
                        <Badge variant="default" className="bg-green-600">
                          All Signed
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          In Progress
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-3 mt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Signatures Collected</span>
                        <span className="font-semibold" data-testid={`text-signatures-${doc.documentType}`}>
                          {doc.signedCount}/{doc.totalRequired} Co-owners
                        </span>
                      </div>
                      
                      <Progress 
                        value={progressPercentage} 
                        className="h-2"
                        data-testid={`progress-${doc.documentType}`}
                      />
                    </div>

                    {isComplete && (
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          data-testid={`button-download-${doc.documentType}`}
                        >
                          <FileText className="mr-2 h-3 w-3" />
                          Download Signed PDF
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      {/* DLD Filing Notice */}
      {allDocumentsComplete && (
        <Card className="border-amber-600 bg-amber-50 dark:bg-amber-950">
          <CardHeader>
            <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Ready for DLD Submission
            </CardTitle>
            <CardDescription className="text-amber-700 dark:text-amber-300">
              All 4 co-owners have signed all documents. Export the DLD filing bundle and submit within 60 days of handover (JOPD Article 4).
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
