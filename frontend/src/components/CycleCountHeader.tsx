import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CycleCountHeaderProps {
  taskName: string;
  taskLocation: string;
  canComplete: boolean;
  onComplete: () => void;
}

const CycleCountHeader = ({ taskName, taskLocation, canComplete, onComplete }: CycleCountHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/dashboard')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>
      
      <h1 className="text-3xl font-bold text-foreground mb-2">
        {taskName}
      </h1>
      <p className="text-muted-foreground">
        Location: {taskLocation} • Scan barcodes to count assets
      </p>

      {canComplete && (
        <div className="flex justify-end mt-4">
          <Button onClick={onComplete} className="bg-success hover:bg-success/90">
            <CheckCircle className="mr-2 h-4 w-4" />
            Complete Task
          </Button>
        </div>
      )}
    </div>
  );
};

export default CycleCountHeader;