import { useState, useRef, useEffect } from "react";
import SignaturePad from "signature_pad";
import { X, Download, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { AgreementTemplate } from "@shared/schema";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: AgreementTemplate;
  investorId: string;
  onSignComplete: () => void;
}

export function SignatureModal({ isOpen, onClose, template, investorId, onSignComplete }: SignatureModalProps) {
  const [currentView, setCurrentView] = useState<"preview" | "sign" | "success">("preview");
  const [signaturePad, setSignaturePad] = useState<SignaturePad | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (canvasRef.current && currentView === "sign") {
      const pad = new SignaturePad(canvasRef.current, {
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
    
    // TODO: Send to backend for encryption and storage
    console.log("Signature captured for:", template.name);
    console.log("Investor ID:", investorId);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setCurrentView("success");
  };

  const handleClose = () => {
    if (currentView === "success") {
      onSignComplete();
    }
    setCurrentView("preview");
    onClose();
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

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleClose} data-testid="button-cancel-preview">
                Cancel
              </Button>
              <Button onClick={() => setCurrentView("sign")} size="lg" data-testid="button-proceed-to-sign">
                Proceed to Sign
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
                  width={700}
                  height={200}
                  className="w-full touch-none"
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
              <Button onClick={handleSignDocument} size="lg" data-testid="button-submit-signature">
                Sign Document
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
