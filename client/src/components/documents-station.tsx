import { FileText, Clock, Edit, CheckCircle, CheckCircle2, Circle, Download, Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface DocumentsStationProps {
  documents: Array<{
    id: string;
    name: string;
    type: 'co_ownership' | 'power_of_attorney' | 'jop_declaration';
    status: 'not_started' | 'in_progress' | 'pending_signature' | 'signed' | 'completed';
    signedAt?: string;
    downloadUrl?: string;
  }>;
  onPreviewSign?: (documentId: string) => void;
  onDownload?: (documentId: string) => void;
  onViewDetails?: (documentId: string) => void;
}

export function DocumentsStation({ 
  documents = [], 
  onPreviewSign, 
  onDownload,
  onViewDetails 
}: DocumentsStationProps) {
  // Calculate progress
  const completedDocuments = documents.filter(
    doc => doc.status === 'signed' || doc.status === 'completed'
  ).length;
  const totalDocuments = documents.length;
  const progressPercentage = totalDocuments > 0 ? (completedDocuments / totalDocuments) * 100 : 0;

  // Helper function to get status badge configuration
  const getStatusConfig = (status: DocumentsStationProps['documents'][0]['status']) => {
    switch (status) {
      case 'not_started':
        return {
          label: 'Not Started',
          icon: Circle,
          className: 'bg-muted text-muted-foreground',
        };
      case 'in_progress':
        return {
          label: 'In Progress',
          icon: Clock,
          className: 'bg-primary text-primary-foreground',
        };
      case 'pending_signature':
        return {
          label: 'Pending Signature',
          icon: Edit,
          className: 'bg-amber-500 text-white dark:bg-amber-600',
        };
      case 'signed':
        return {
          label: 'Signed',
          icon: CheckCircle,
          className: 'bg-green-600 text-white',
        };
      case 'completed':
        return {
          label: 'Completed',
          icon: CheckCircle2,
          className: 'bg-green-600 text-white',
        };
      default:
        return {
          label: 'Unknown',
          icon: Circle,
          className: 'bg-muted text-muted-foreground',
        };
    }
  };

  // Helper to determine if document can be signed
  const canSign = (status: string) => {
    return status === 'in_progress' || status === 'pending_signature';
  };

  // Helper to determine if document can be downloaded
  const canDownload = (status: string) => {
    return status === 'signed' || status === 'completed';
  };

  // Empty state
  if (documents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Documents</CardTitle>
          <CardDescription>No documents available</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            Your legal documents will appear here once they are ready
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-serif">Legal Documents</CardTitle>
              <CardDescription>
                Track and manage your co-ownership legal documents
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary" data-testid="text-documents-completed">
                {completedDocuments}/{totalDocuments}
              </div>
              <p className="text-xs text-muted-foreground">Documents Signed</p>
            </div>
          </div>
          <Progress 
            value={progressPercentage} 
            className="h-2 mt-4" 
            data-testid="progress-documents-station" 
          />
        </CardHeader>
      </Card>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signed Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const statusConfig = getStatusConfig(doc.status);
              const StatusIcon = statusConfig.icon;

              return (
                <TableRow 
                  key={doc.id} 
                  className="hover-elevate"
                  data-testid={`row-document-${doc.type}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      <div>
                        <div className="font-medium" data-testid={`text-document-name-${doc.type}`}>
                          {doc.name}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {doc.type.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={statusConfig.className}
                      data-testid={`badge-status-${doc.type}`}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span 
                      className="text-sm text-muted-foreground"
                      data-testid={`text-signed-date-${doc.type}`}
                    >
                      {doc.signedAt ? format(new Date(doc.signedAt), 'MMM dd, yyyy') : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      {canSign(doc.status) && onPreviewSign && (
                        <Button
                          size="sm"
                          onClick={() => onPreviewSign(doc.id)}
                          data-testid={`button-preview-sign-${doc.type}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Preview & Sign
                        </Button>
                      )}
                      {canDownload(doc.status) && onDownload && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onDownload(doc.id)}
                          data-testid={`button-download-${doc.type}`}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          Download PDF
                        </Button>
                      )}
                      {onViewDetails && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewDetails(doc.id)}
                          data-testid={`button-view-details-${doc.type}`}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Details
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {documents.map((doc) => {
          const statusConfig = getStatusConfig(doc.status);
          const StatusIcon = statusConfig.icon;

          return (
            <Card 
              key={doc.id}
              className="hover-elevate"
              data-testid={`card-document-${doc.type}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg" data-testid={`text-document-name-mobile-${doc.type}`}>
                      {doc.name}
                    </CardTitle>
                    <CardDescription className="capitalize">
                      {doc.type.replace(/_/g, ' ')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge 
                    className={statusConfig.className}
                    data-testid={`badge-status-mobile-${doc.type}`}
                  >
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                
                {doc.signedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Signed Date</span>
                    <span 
                      className="text-sm font-medium"
                      data-testid={`text-signed-date-mobile-${doc.type}`}
                    >
                      {format(new Date(doc.signedAt), 'MMM dd, yyyy')}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {canSign(doc.status) && onPreviewSign && (
                    <Button
                      className="w-full"
                      onClick={() => onPreviewSign(doc.id)}
                      data-testid={`button-preview-sign-mobile-${doc.type}`}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Preview & Sign
                    </Button>
                  )}
                  {canDownload(doc.status) && onDownload && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => onDownload(doc.id)}
                      data-testid={`button-download-mobile-${doc.type}`}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                  {onViewDetails && (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => onViewDetails(doc.id)}
                      data-testid={`button-view-details-mobile-${doc.type}`}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Completion Message */}
      {completedDocuments === totalDocuments && totalDocuments > 0 && (
        <Card className="border-green-600 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0" />
              <div>
                <CardTitle className="text-green-900 dark:text-green-100">
                  All Documents Completed!
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  You have signed all required legal documents for your investment
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
