import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Camera, Monitor, QrCode, Upload, Check, X, Smartphone } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { MinimalUploadDisplay } from './MinimalUploadDisplay';
import QRCode from 'qrcode';

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

interface SmartUploadProps {
  onFilesUploaded: (files: File[]) => void;
  sessionId: string;
  maxFiles?: number;
  accept?: string;
  testType: string;
}

export const SmartUpload: React.FC<SmartUploadProps> = ({
  onFilesUploaded,
  sessionId,
  maxFiles = 5,
  accept = "image/*",
  testType
}) => {
  const isMobile = useIsMobile();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Generate QR code for mobile upload
  const generateQRCode = async () => {
    try {
      const uploadUrl = `${window.location.origin}/mobile-upload?sessionId=${sessionId}&testType=${testType}`;
      const qrDataUrl = await QRCode.toDataURL(uploadUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setShowQRDialog(true);
    } catch (error) {
      toast({
        title: 'QR Code Error',
        description: 'Failed to generate QR code. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle file selection (desktop upload)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    processFiles(files);
  };

  // Handle camera capture (mobile)
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Process uploaded files
  const processFiles = (files: File[]) => {
    if (files.length + uploadedFiles.length > maxFiles) {
      toast({
        title: 'Too Many Files',
        description: `You can only upload up to ${maxFiles} files.`,
        variant: 'destructive',
      });
      return;
    }

    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      status: 'uploading' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload process (you can replace this with actual upload logic)
    newFiles.forEach((uploadFile, index) => {
      setTimeout(() => {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'success' as const, url: URL.createObjectURL(uploadFile.file) }
              : f
          )
        );
      }, 1000 + index * 500);
    });
  };

  // Remove uploaded file
  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Handle final confirmation
  const handleConfirm = () => {
    const successfulFiles = uploadedFiles
      .filter(f => f.status === 'success')
      .map(f => f.file);
    
    if (successfulFiles.length === 0) {
      toast({
        title: 'No Files',
        description: 'Please upload at least one file before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    onFilesUploaded(successfulFiles);
    setShowConfirmation(false);
  };

  // Listen for files uploaded via mobile (you'd implement this with your backend)
  useEffect(() => {
    // This would typically listen to a WebSocket or polling mechanism
    // For now, we'll just simulate it
    const checkForMobileUploads = () => {
      // Implementation would check for files uploaded via the mobile interface
    };

    const interval = setInterval(checkForMobileUploads, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const allFilesUploaded = uploadedFiles.length > 0 && uploadedFiles.every(f => f.status === 'success');
  const hasFailedUploads = uploadedFiles.some(f => f.status === 'error');

  return (
    <div className="space-y-4">
      {/* Upload Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Your Answer Images
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isMobile ? (
            // Mobile interface - direct camera access
            <div className="space-y-3">
              <Button
                onClick={handleCameraCapture}
                className="w-full h-16"
                size="lg"
              >
                <Camera className="w-6 h-6 mr-2" />
                Take Photo & Upload
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose from Gallery
              </Button>
            </div>
          ) : (
            // Desktop interface - QR code or file upload
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={generateQRCode}
                className="h-16"
                size="lg"
              >
                <div className="flex flex-col items-center gap-1">
                  <QrCode className="w-6 h-6" />
                  <span className="text-sm">Scan QR to Upload from Phone</span>
                </div>
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="h-16"
                size="lg"
              >
                <div className="flex flex-col items-center gap-1">
                  <Monitor className="w-6 h-6" />
                  <span className="text-sm">Upload from Computer</span>
                </div>
              </Button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Minimal Upload Display */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3">
              <p className="text-sm font-medium">
                Upload Status ({uploadedFiles.filter(f => f.status === 'success').length} of {uploadedFiles.length} files uploaded)
              </p>
            </div>
            <MinimalUploadDisplay 
              files={uploadedFiles.map(file => ({
                id: file.id,
                name: file.file.name,
                size: file.file.size,
                status: file.status,
                onRemove: removeFile
              }))}
            />
            {hasFailedUploads && (
              <Alert className="mt-3">
                <AlertDescription className="text-sm">
                  Some files failed to upload. Please remove failed uploads and try again.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Step */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            {hasFailedUploads && (
              <Alert className="mb-4">
                <X className="h-4 w-4" />
                <AlertDescription>
                  Some files failed to upload. Please remove failed uploads and try again.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="text-center">
                <p className="font-medium">Have you uploaded all your answer photos?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {uploadedFiles.filter(f => f.status === 'success').length} of {uploadedFiles.length} files uploaded successfully
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setUploadedFiles([])}
                  className="flex-1"
                >
                  Reset & Try Again
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!allFilesUploaded}
                  className="flex-1"
                >
                  Yes, Proceed to Evaluation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Scan with Your Phone
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              {qrCodeUrl && (
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code for mobile upload" 
                  className="border rounded-lg"
                />
              )}
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                1. Open your phone's camera app
              </p>
              <p className="text-sm text-muted-foreground">
                2. Point it at the QR code above
              </p>
              <p className="text-sm text-muted-foreground">
                3. Tap the notification to open the upload page
              </p>
              <p className="text-sm text-muted-foreground">
                4. Take photos and upload your answers
              </p>
            </div>
            <Alert>
              <AlertDescription>
                Files uploaded from your phone will sync automatically to this session.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};