import { useQuery } from "@tanstack/react-query";

export interface SignatureStatus {
  signatures: Array<{
    templateId: string;
    signedAt: string;
    documentType: string;
  }>;
}

export function useSignatureStatus(investorId: string | undefined) {
  return useQuery<SignatureStatus>({
    queryKey: ["/api/signatures/investor", investorId, "status"],
    enabled: !!investorId,
  });
}
