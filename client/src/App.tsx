import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import Payment from "@/pages/payment";
import Admin from "@/pages/admin";
import ExpressInterest from "@/pages/express-interest";
import ReservationDetails from "@/pages/reservation-details";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/payment" component={Payment} />
      <Route path="/admin" component={Admin} />
      <Route path="/properties/:propertyId/express-interest" component={ExpressInterest} />
      <Route path="/reservations/:reservationId" component={ReservationDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
