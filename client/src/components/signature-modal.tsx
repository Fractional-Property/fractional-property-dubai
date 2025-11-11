import { useState, useRef, useEffect } from "react";
import SignaturePad from "signature_pad";
import { X, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AgreementTemplate } from "@shared/schema";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AgreementTemplate;
  investorId: string;
  propertyId: string;
  onSignComplete: () => void;
}

export function SignatureModal({ isOpen, onClose, template, investorId, propertyId, onSignComplete }: SignatureModalProps) {
  const [currentView, setCurrentView] = useState<"preview" | "sign" | "success">("preview");
  const [signaturePad, setSignaturePad] = useState<SignaturePad | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Create signature session when modal opens
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/signatures/create-session", {
        investorId,
        propertyId,
        templateId: template.id
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      setSessionToken(data.sessionToken);
    },
    onError: (error: any) => {
      toast({
        title: "Session Creation Failed",
        description: error.message || "Failed to create signature session. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Submit signature mutation
  const submitSignatureMutation = useMutation({
    mutationFn: async (signatureDataUrl: string) => {
      const res = await apiRequest("POST", "/api/signatures/submit-signature", {
        sessionToken,
        signatureDataUrl,
        consentGiven: true
      });
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate queries to refresh signature status
      queryClient.invalidateQueries({ queryKey: ["/api/signatures/investor", investorId, "status"] });
      setCurrentView("success");
    },
    onError: (error: any) => {
      toast({
        title: "Signature Failed",
        description: error.message || "Failed to save signature. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Create session when modal opens
  useEffect(() => {
    if (isOpen && !sessionToken && !createSessionMutation.isPending) {
      createSessionMutation.mutate();
    }
  }, [isOpen, sessionToken]);

  useEffect(() => {
    if (canvasRef.current && currentView === "sign") {
      const canvas = canvasRef.current;
      
      // HiDPI canvas scaling for crisp signatures
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext("2d")?.scale(ratio, ratio);
      
      const pad = new SignaturePad(canvas, {
        backgroundColor: "rgb(255, 255, 255)",
        penColor: "rgb(0, 0, 0)",
      });
      setSignaturePad(pad);
      
      return () => {
        pad.off();
      };
    }
  }, [currentView]);

  const handleClearSignature = () => {
    signaturePad?.clear();
  };

  const handleSignDocument = async () => {
    if (!signaturePad || signaturePad.isEmpty()) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature before continuing",
        variant: "destructive",
      });
      return;
    }

    // Get signature data
    const signatureDataUrl = signaturePad.toDataURL();
    
    // Submit to backend for encryption and storage
    submitSignatureMutation.mutate(signatureDataUrl);
  };

  const handleClose = () => {
    if (currentView === "success") {
      onSignComplete();
    }
    
    // Reset all modal state
    setCurrentView("preview");
    setSessionToken("");
    if (signaturePad) {
      signaturePad.clear();
      setSignaturePad(null);
    }
    
    onClose();
  };

  const handleProceedToSign = () => {
    if (!sessionToken) {
      toast({
        title: "Session Not Ready",
        description: "Please wait for the signature session to be created.",
        variant: "destructive"
      });
      return;
    }
    setCurrentView("sign");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-signature">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-serif">{template.name}</DialogTitle>
              <DialogDescription>
                {currentView === "preview" && "Review the document carefully before signing"}
                {currentView === "sign" && "Draw your signature in the box below"}
                {currentView === "success" && "Document signed successfully"}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose} data-testid="button-close-modal">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {currentView === "preview" && (
          <div className="space-y-6">
            <div className="bg-muted/30 rounded-lg p-6 border max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none" data-testid="document-preview-content">
                <pre className="whitespace-pre-wrap font-sans text-sm">{template.content}</pre>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Legal Agreement
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    By signing this document, you acknowledge that you have read, understood, and agree to all terms and conditions outlined above. This agreement is legally binding and compliant with DLD regulations.
                  </p>
                </div>
              </div>
            </div>

            {createSessionMutation.isError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      Session Error
                    </p>
                    <p className="text-red-700 dark:text-red-300">
                      Failed to create signature session. Please close and try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel-preview">
                Cancel
              </Button>
              <Button 
                onClick={handleProceedToSign} 
                size="lg" 
                disabled={createSessionMutation.isPending || !sessionToken}
                data-testid="button-proceed-to-sign"
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  "Proceed to Sign"
                )}
              </Button>
            </div>
          </div>
        )}

        {currentView === "sign" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Draw Your Signature</label>
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-1 bg-white">
                <canvas
                  ref={canvasRef}
                  className="w-full h-[200px] touch-none"
                  data-testid="canvas-signature"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Use your mouse or touchscreen to draw your signature above
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClearSignature} data-testid="button-clear-signature">
                Clear
              </Button>
              <Button variant="outline" onClick={() => setCurrentView("preview")} data-testid="button-back-to-preview">
                Back to Preview
              </Button>
              <Button 
                onClick={handleSignDocument} 
                size="lg" 
                disabled={submitSignatureMutation.isPending}
                data-testid="button-submit-signature"
              >
                {submitSignatureMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  "Sign Document"
                )}
              </Button>
            </div>
          </div>
        )}

        {currentView === "success" && (
          <div className="space-y-6 py-8">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-600" data-testid="icon-signature-success" />
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-2">Document Signed Successfully!</h3>
                <p className="text-muted-foreground">
                  Your signature has been encrypted and securely stored. You can download the signed document at any time.
                </p>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleClose} size="lg" data-testid="button-continue">
                Continue to Next Step
              </Button>
              <Button variant="outline" size="lg" data-testid="button-download-signed">
                <Download className="mr-2 h-4 w-4" />
                Download Signed Document
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
