import { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onScanSuccess, onClose }: BarcodeScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isScanning && scannerElementRef.current) {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      scannerRef.current = new Html5QrcodeScanner(
        scannerElementRef.current.id,
        config,
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanning();
        },
        (error) => {
          console.warn('QR Code scan error:', error);
        }
      );
    }

    return () => {
      stopScanning();
    };
  }, [isScanning, onScanSuccess]);

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanning = () => {
    setIsScanning(true);
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6 bg-card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Scan Barcode</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {!isScanning ? (
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto bg-scan-glow/10 rounded-full flex items-center justify-center">
            <Camera className="h-12 w-12 text-scan-glow" />
          </div>
          <p className="text-muted-foreground">
            Position the barcode within the camera frame to scan
          </p>
          <Button onClick={startScanning} className="w-full bg-primary hover:bg-primary/90">
            <Camera className="mr-2 h-4 w-4" />
            Start Scanning
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            id="qr-reader" 
            ref={scannerElementRef}
            className="w-full"
          />
          <Button 
            onClick={stopScanning} 
            variant="outline" 
            className="w-full"
          >
            Stop Scanning
          </Button>
        </div>
      )}
    </Card>
  );
};

export default BarcodeScanner;