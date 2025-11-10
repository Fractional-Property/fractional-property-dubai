import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Upload, FileText, Check, AlertCircle, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface KYCUploadProps {
  investorId: string;
  currentDocuments?: {
    passportDocPath?: string | null;
    proofOfAddressPath?: string | null;
    bankStatementPath?: string | null;
  };
}

interface DocumentState {
  file: File | null;
  preview: string | null;
  uploaded: boolean;
}

export function KYCUpload({ investorId, currentDocuments }: KYCUploadProps) {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<{
    passport: DocumentState;
    proofOfAddress: DocumentState;
    bankStatement: DocumentState;
  }>({
    passport: { file: null, preview: null, uploaded: !!currentDocuments?.passportDocPath },
    proofOfAddress: { file: null, preview: null, uploaded: !!currentDocuments?.proofOfAddressPath },
    bankStatement: { file: null, preview: null, uploaded: !!currentDocuments?.bankStatementPath },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/investors/${investorId}/upload-documents`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Documents Uploaded",
        description: `Successfully uploaded ${data.uploadedFiles.length} document(s)`,
      });
      
      setDocuments((prev) => ({
        passport: { ...prev.passport, uploaded: data.uploadedFiles.includes("passport") || prev.passport.uploaded },
        proofOfAddress: { ...prev.proofOfAddress, uploaded: data.uploadedFiles.includes("proofOfAddress") || prev.proofOfAddress.uploaded },
        bankStatement: { ...prev.bankStatement, uploaded: data.uploadedFiles.includes("bankStatement") || prev.bankStatement.uploaded },
      }));
      
      queryClient.invalidateQueries({ queryKey: [`/api/investors/${investorId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (type: keyof typeof documents, file: File) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Only PDF, JPG, and PNG files are allowed",
        variant: "destructive",
      });
      return;
    }

    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

    setDocuments((prev) => ({
      ...prev,
      [type]: { file, preview, uploaded: false },
    }));
  };

  const handleRemoveFile = (type: keyof typeof documents) => {
    if (documents[type].preview) {
      URL.revokeObjectURL(documents[type].preview!);
    }
    setDocuments((prev) => ({
      ...prev,
      [type]: { file: null, preview: null, uploaded: prev[type].uploaded },
    }));
  };

  const handleUpload = () => {
    const formData = new FormData();
    let hasFiles = false;

    if (documents.passport.file) {
      formData.append("passport", documents.passport.file);
      hasFiles = true;
    }
    if (documents.proofOfAddress.file) {
      formData.append("proofOfAddress", documents.proofOfAddress.file);
      hasFiles = true;
    }
    if (documents.bankStatement.file) {
      formData.append("bankStatement", documents.bankStatement.file);
      hasFiles = true;
    }

    if (!hasFiles) {
      toast({
        title: "No Files Selected",
        description: "Please select at least one document to upload",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(formData);
  };

  const renderDocumentUpload = (
    type: keyof typeof documents,
    title: string,
    description: string,
    testId: string
  ) => {
    const doc = documents[type];

    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {doc.uploaded && !doc.file && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
              <Check className="h-4 w-4" />
              <span>Uploaded</span>
            </div>
          )}
        </div>

        {doc.file ? (
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(doc.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleRemoveFile(type)}
                disabled={uploadMutation.isPending}
                data-testid={`button-remove-${testId}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {doc.preview && (
              <img
                src={doc.preview}
                alt="Preview"
                className="mt-3 rounded-md max-h-48 w-full object-cover"
              />
            )}
          </div>
        ) : (
          <label
            className="block p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover-elevate active-elevate-2 transition-colors"
            data-testid={`label-upload-${testId}`}
          >
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(type, file);
              }}
              disabled={uploadMutation.isPending}
              data-testid={`input-file-${testId}`}
            />
            <Upload className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">PDF, JPG, or PNG (max 5MB)</p>
          </label>
        )}
      </div>
    );
  };

  const pendingUploads = Object.values(documents).filter(doc => doc.file && !doc.uploaded).length;
  const totalUploaded = Object.values(documents).filter(doc => doc.uploaded).length;

  return (
    <Card data-testid="card-kyc-upload">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          KYC Document Upload
        </CardTitle>
        <CardDescription>
          Upload your identity verification documents. All documents are securely stored and encrypted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Required: Valid passport or Emirates ID, proof of UAE address, and recent bank statement
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {renderDocumentUpload(
            "passport",
            "Passport / Emirates ID",
            "Clear copy of your passport or Emirates ID",
            "passport"
          )}
          {renderDocumentUpload(
            "proofOfAddress",
            "Proof of Address",
            "Utility bill, rental agreement, or bank statement showing your UAE address",
            "proof-of-address"
          )}
          {renderDocumentUpload(
            "bankStatement",
            "Bank Statement",
            "Recent bank statement (last 3 months)",
            "bank-statement"
          )}
        </div>

        {uploadMutation.isPending && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Uploading documents...</span>
              <span className="font-medium">Processing</span>
            </div>
            <Progress value={50} className="h-2" />
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {totalUploaded} of 3 documents uploaded
          </div>
          <Button
            onClick={handleUpload}
            disabled={pendingUploads === 0 || uploadMutation.isPending}
            data-testid="button-upload-all"
          >
            {uploadMutation.isPending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {pendingUploads > 0 ? `${pendingUploads} Document${pendingUploads > 1 ? 's' : ''}` : 'Documents'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
