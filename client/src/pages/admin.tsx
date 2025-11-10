import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Building2, Download, Check, X, Search, LogOut, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminLoginForm } from "@/components/admin-login-form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Investor } from "@shared/schema";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const { data: investors = [], isLoading } = useQuery<Investor[]>({
    queryKey: ["/api/admin/investors"],
    enabled: isAuthenticated,
  });

  const approveKYCMutation = useMutation({
    mutationFn: async (investorId: string) => {
      const response = await fetch(`/api/admin/investors/${investorId}/kyc`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!response.ok) throw new Error("Failed to approve KYC");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/investors"] });
      toast({
        title: "KYC Approved",
        description: "Investor KYC status has been updated",
      });
    },
  });

  const notifyFundedMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/notify-funded", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to send notification");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notification Sent",
        description: data.message,
      });
    },
  });

  const notifyKYCMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/notify-kyc-reminder", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to send reminder");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reminder Sent",
        description: data.message,
      });
    },
  });

  const filteredInvestors = investors.filter(
    (investor) =>
      investor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      investor.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExportCSV = () => {
    const csvHeaders = ["Name", "Email", "Phone", "Fractions", "Total Invested", "Payment Status", "KYC Status"];
    const csvRows = filteredInvestors.map((inv) => [
      inv.fullName,
      inv.email,
      inv.phone,
      inv.fractionsPurchased.toString(),
      inv.totalInvested,
      inv.paymentStatus,
      inv.kycStatus,
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fopd-investors-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  if (!isAuthenticated) {
    return <AdminLoginForm onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <span className="text-2xl font-bold font-serif">FOPD</span>
              <span className="ml-2 text-sm text-muted-foreground">Admin Panel</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsAuthenticated(false)} data-testid="button-admin-logout">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold font-serif mb-2">Investor Management</h1>
          <p className="text-muted-foreground">Manage investors, KYC status, and notifications</p>
        </div>

        <div className="grid lg:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-investors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{investors.length}</div>
            </CardContent>
          </Card>

          <Card data-testid="card-fractions-sold">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fractions Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">7 / 10</div>
            </CardContent>
          </Card>

          <Card data-testid="card-total-revenue">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                AED {investors.reduce((sum, inv) => sum + Number(inv.totalInvested), 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-kyc-pending">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">KYC Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">
                {investors.filter((inv) => inv.kycStatus === "pending").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-serif">All Investors</CardTitle>
              <CardDescription>View and manage all investor accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-investors"
                  />
                </div>
                <Button onClick={handleExportCSV} data-testid="button-export-csv">
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>

              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-center">Fractions</TableHead>
                      <TableHead className="text-right">Invested</TableHead>
                      <TableHead className="text-center">Payment</TableHead>
                      <TableHead className="text-center">Documents</TableHead>
                      <TableHead className="text-center">KYC</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12">
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
                            <span className="text-muted-foreground">Loading investors...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredInvestors.length > 0 ? (
                      filteredInvestors.map((investor) => (
                        <TableRow key={investor.id} data-testid={`row-investor-${investor.id}`}>
                          <TableCell className="font-medium">{investor.fullName}</TableCell>
                          <TableCell className="text-muted-foreground">{investor.email}</TableCell>
                          <TableCell className="text-muted-foreground">{investor.phone}</TableCell>
                          <TableCell className="text-center tabular-nums">{investor.fractionsPurchased}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            AED {Number(investor.totalInvested).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={investor.paymentStatus === "completed" ? "default" : "secondary"}
                              className="capitalize"
                              data-testid={`badge-payment-status-${investor.id}`}
                            >
                              {investor.paymentStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1" data-testid={`text-documents-status-${investor.id}`}>
                              {investor.passportDocPath && (
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Passport uploaded" />
                              )}
                              {investor.proofOfAddressPath && (
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Proof of address uploaded" />
                              )}
                              {investor.bankStatementPath && (
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Bank statement uploaded" />
                              )}
                              {!investor.passportDocPath && !investor.proofOfAddressPath && !investor.bankStatementPath && (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={investor.kycStatus === "approved" ? "default" : "secondary"}
                              className="capitalize"
                              data-testid={`badge-kyc-status-${investor.id}`}
                            >
                              {investor.kycStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {investor.kycStatus === "pending" && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => approveKYCMutation.mutate(investor.id)}
                                  disabled={approveKYCMutation.isPending}
                                  data-testid={`button-approve-kyc-${investor.id}`}
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Approve KYC
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" data-testid={`button-view-details-${investor.id}`}>
                                View
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          {searchQuery ? "No investors found matching your search" : "No investors yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl font-serif text-primary">Critical Actions</CardTitle>
              <CardDescription>Trigger notifications and manage property milestones</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Unit Fully Funded Notification</h3>
                  <p className="text-sm text-muted-foreground">
                    Send email notification to all 4 co-owners that the property is fully funded
                  </p>
                </div>
                <Button 
                  variant="default" 
                  onClick={() => notifyFundedMutation.mutate()}
                  disabled={notifyFundedMutation.isPending}
                  data-testid="button-trigger-funded-notification"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Notification
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">KYC Reminder Email</h3>
                  <p className="text-sm text-muted-foreground">
                    Send reminder to all investors with pending KYC status
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => notifyKYCMutation.mutate()}
                  disabled={notifyKYCMutation.isPending}
                  data-testid="button-send-kyc-reminder"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Reminders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
