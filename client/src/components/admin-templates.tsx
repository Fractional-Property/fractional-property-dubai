import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { FileText, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { AgreementTemplate } from "@shared/schema";

export function AdminTemplates() {
  const [editingTemplate, setEditingTemplate] = useState<AgreementTemplate | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<AgreementTemplate[]>({
    queryKey: ["/api/templates"],
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await apiRequest("PUT", `/api/admin/templates/${id}`, { content });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      setEditingTemplate(null);
      setEditedContent("");
      toast({
        title: "Template Updated",
        description: "The agreement template has been saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditClick = (template: AgreementTemplate) => {
    setEditingTemplate(template);
    setEditedContent(template.content);
  };

  const handleSave = () => {
    if (!editingTemplate) return;
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      content: editedContent,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-serif mb-2">Agreement Templates</h2>
        <p className="text-muted-foreground">
          Manage legal document templates. Changes are versioned and tracked for compliance.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <Card key={template.id} data-testid={`card-template-${template.templateType}`}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    Version {template.version}
                    {template.isActive && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Template Type:</strong>{" "}
                  {template.templateType === "co_ownership"
                    ? "Co-Ownership Agreement"
                    : "Power of Attorney"}
                </p>
                <p>
                  <strong>Last Updated:</strong>{" "}
                  {new Date(template.updatedAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      data-testid={`button-view-${template.templateType}`}
                    >
                      View Content
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{template.name}</DialogTitle>
                      <DialogDescription>
                        Version {template.version} • Read-only preview
                      </DialogDescription>
                    </DialogHeader>
                    <div className="p-4 bg-muted rounded-md">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {template.content}
                      </pre>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditClick(template)}
                  data-testid={`button-edit-${template.templateType}`}
                >
                  Edit Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit {editingTemplate.name}</DialogTitle>
              <DialogDescription>
                Changes will create a new version (v{editingTemplate.version + 1}) and update
                the content hash for tamper detection.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[500px] font-mono text-sm"
                placeholder="Enter agreement content with placeholders like {{INVESTOR_NAME}}, {{PROPERTY_TITLE}}, etc."
                data-testid="textarea-template-content"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingTemplate(null)}
                data-testid="button-cancel-edit"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateTemplateMutation.isPending || editedContent === editingTemplate.content}
                data-testid="button-save-template"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateTemplateMutation.isPending ? "Saving..." : "Save Template"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
