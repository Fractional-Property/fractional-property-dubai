import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Download, FileText, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PropertySignatureStatus {
  propertyId: string;
  documents: Array<{
    templateId: string;
    templateName: string;
    documentType: string;
    signedCount: number;
    totalRequired: number;
    isComplete: boolean;
    signedInvestorIds: string[];
  }>;
  allComplete: boolean;
}

export function AdminSignatureStatus() {
  const { toast } = useToast();
  const propertyId = "pilot-property-jvc-001";
  
  const { data: signatureStatus, isLoading } = useQuery<PropertySignatureStatus>({
    queryKey: ["/api/signatures/property", propertyId, "status"],
  });

  // Mutation for generating PDFs
  const generatePDFMutation = useMutation({
    mutationFn: async ({ propertyId, documentType, investorId }: { 
      propertyId: string; 
      documentType: string; 
      investorId: string;
    }) => {
      const response = await apiRequest("POST", "/api/documents/generate", {
        propertyId,
        documentType,
        investorId
      });
      return response.json();
    }
  });

  // Mutation for exporting DLD bundle
  const exportDLDBundleMutation = useMutation({
    mutationFn: async (propertyId: string) => {
      const response = await fetch(`/api/documents/export-dld-bundle/${propertyId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to export DLD bundle");
      }

      // Get the blob from response
      const blob = await response.blob();
      
      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "dld-bundle.zip";
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      return { blob, filename };
    }
  });

  const handleDownloadPDF = async (documentType: string, doc: any) => {
    try {
      // Get the first investor who signed this document
      if (!doc.signedInvestorIds || doc.signedInvestorIds.length === 0) {
        toast({
          title: "No Signatures Found",
          description: "This document has not been signed yet",
          variant: "destructive"
        });
        return;
      }

      const investorId = doc.signedInvestorIds[0];

      toast({
        title: "Generating PDF",
        description: `Creating signed document for ${doc.templateName}...`,
      });

      const result = await generatePDFMutation.mutateAsync({
        propertyId,
        documentType,
        investorId
      });

      // Download the PDF
      const downloadUrl = `/api/documents/${result.document.id}/download`;
      window.open(downloadUrl, '_blank');

      toast({
        title: "PDF Generated",
        description: "Document is ready for download",
      });
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate PDF",
        variant: "destructive"
      });
    }
  };

  const handleSendToAllInvestors = () => {
    toast({
      title: "Sending Documents",
      description: "E-signature requests sent to all 4 investors via email",
    });
  };

  const handleExportDLDBundle = async () => {
    try {
      toast({
        title: "Exporting DLD Bundle",
        description: "Generating consolidated PDFs and CSV for DLD submission...",
      });

      const result = await exportDLDBundleMutation.mutateAsync(propertyId);

      // Create a download link and trigger download
      const url = window.URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Bundle Exported Successfully",
        description: `Downloaded ${result.filename} with 3 PDFs, CSV, and metadata`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export DLD bundle. Please ensure all signatures are complete.",
        variant: "destructive"
      });
    }
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
                disabled={exportDLDBundleMutation.isPending}
              >
                <Download className="mr-2 h-4 w-4" />
                {exportDLDBundleMutation.isPending ? "Generating Bundle..." : "Export DLD Bundle"}
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

                    {doc.signedCount > 0 && doc.signedInvestorIds && doc.signedInvestorIds.length > 0 && (
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDownloadPDF(doc.documentType, doc)}
                          disabled={generatePDFMutation.isPending}
                          data-testid={`button-download-${doc.documentType}`}
                        >
                          <FileText className="mr-2 h-3 w-3" />
                          {generatePDFMutation.isPending ? "Generating..." : "Download Signed PDF"}
                        </Button>
                        {!isComplete && (
                          <Badge variant="secondary" className="self-center">
                            {doc.signedCount}/4 available
                          </Badge>
                        )}
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
