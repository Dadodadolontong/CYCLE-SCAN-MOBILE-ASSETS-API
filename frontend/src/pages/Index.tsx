import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/FastAPIAuthContext";
import { UserMenu } from "@/components/UserMenu";
import { Barcode, Smartphone, Camera, LogIn } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <div className="border-b border-border/40">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Barcode className="h-6 w-6 text-primary" />
            <span className="font-semibold text-foreground">Asset Cycle Count</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <UserMenu />
            ) : (
              <Button 
                variant="outline" 
                onClick={() => navigate('/auth')}
                className="flex items-center space-x-2"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 max-w-4xl">
        <div className="text-center py-12">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Barcode className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Asset Cycle Count
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Professional PWA for warehouse asset management with barcode scanning capabilities
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 text-center bg-card">
              <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Camera Scanning
              </h3>
              <p className="text-muted-foreground">
                Use your device camera to scan barcodes quickly and accurately
              </p>
            </Card>

            <Card className="p-6 text-center bg-card">
              <Smartphone className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Mobile Optimized
              </h3>
              <p className="text-muted-foreground">
                Designed for mobile devices with offline PWA capabilities
              </p>
            </Card>

            <Card className="p-6 text-center bg-card">
              <Barcode className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Asset Tracking
              </h3>
              <p className="text-muted-foreground">
                Track asset counts with real-time progress monitoring
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            {user ? (
              <Button 
                onClick={() => navigate('/dashboard')}
                size="lg"
                className="h-14 px-8 bg-primary hover:bg-primary/90 w-full sm:w-auto"
              >
                <Barcode className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Button>
            ) : (
              <div className="space-x-4">
                <Button 
                  onClick={() => navigate('/auth')}
                  size="lg"
                  className="h-14 px-8 bg-primary hover:bg-primary/90 w-full sm:w-auto"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Get Started
                </Button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {user ? 'Access your tasks and manage asset counting' : 'Sign in to access your dashboard and manage asset counting'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
