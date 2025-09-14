import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Monitor, QrCode, Upload, Check, X, Smartphone, AlertCircle } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';
import { useUploadManager } from '@/hooks/useUploadManager';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

interface TestImageUploadProps {
  onFilesUploaded: (files: File[]) => void;
  sessionId: string;
  testType: string;
  maxFiles?: number;
  currentUploadedImage?: File | null;
  onImageChange?: (file: File | null) => void;
}

export const TestImageUpload: React.FC<TestImageUploadProps> = ({
  onFilesUploaded,
  sessionId,
  testType,
  maxFiles = 3,
  currentUploadedImage,
  onImageChange
}) => {
  const isMobile = useIsMobile();
  const { uploadMultipleFiles, isUploading, uploadProgress } = useUploadManager(sessionId);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Listen for real-time uploads from mobile
  useEffect(() => {
    const channel = supabase
      .channel('session-uploads')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_uploads',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('New mobile upload detected:', payload);
          const upload = payload.new;
          
          // Create a File object from the upload data for compatibility
          const mockFile = new File([''], upload.file_path.split('/').pop() || 'mobile_upload.jpg', {
            type: 'image/jpeg'
          });
          
          const newFile: UploadedFile = {
            file: mockFile,
            id: upload.id,
            status: 'success',
            url: upload.public_url
          };
          
          setUploadedFiles(prev => [...prev, newFile]);
          
          toast({
            title: 'Mobile Upload Received',
            description: 'File uploaded from your phone successfully!',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Generate QR code for mobile upload
  const generateQRCode = async () => {
    try {
      // Create upload session via edge function
      const { data, error } = await supabase.functions.invoke('create-upload-session', {
        body: { sessionId, testType }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create upload session');
      }

      const qrDataUrl = await QRCode.toDataURL(data.uploadUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
      setShowQRDialog(true);
    } catch (error: any) {
      console.error('QR Code generation error:', error);
      toast({
        title: 'QR Code Error',
        description: 'Failed to generate QR code. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length + uploadedFiles.length > maxFiles) {
      toast({
        title: 'Too Many Files',
        description: `You can only upload up to ${maxFiles} files.`,
        variant: 'destructive',
      });
      return;
    }

    // Create file entries with uploading status
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      status: 'uploading' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload files
    const results = await uploadMultipleFiles(files);
    
    // Update file statuses based on upload results
    results.forEach((result, index) => {
      const fileId = newFiles[index].id;
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { 
                ...f, 
                status: result.success ? 'success' as const : 'error' as const,
                url: result.url,
                error: result.error
              }
            : f
        )
      );
    });

    // For backward compatibility, set the first successful file as current uploaded image
    const firstSuccessfulFile = files.find((_, index) => results[index].success);
    if (firstSuccessfulFile && onImageChange) {
      onImageChange(firstSuccessfulFile);
    }
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Remove uploaded file
  const removeFile = (id: string) => {
    const fileToRemove = uploadedFiles.find(f => f.id === id);
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
    
    // If removing the current uploaded image, clear it
    if (fileToRemove && currentUploadedImage && fileToRemove.file === currentUploadedImage && onImageChange) {
      onImageChange(null);
    }
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

  const allFilesUploaded = uploadedFiles.length > 0 && uploadedFiles.every(f => f.status === 'success');
  const hasFailedUploads = uploadedFiles.some(f => f.status === 'error');
  const successfulUploads = uploadedFiles.filter(f => f.status === 'success').length;

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
                disabled={isUploading}
                className="w-full h-16"
                size="lg"
              >
                <Camera className="w-6 h-6 mr-2" />
                Take Photo & Upload
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
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
                disabled={isUploading}
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
                disabled={isUploading}
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
            accept="image/*"
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

      {/* Current Uploaded Image (for backward compatibility) */}
      {currentUploadedImage && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950">
              <Check className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-sm">{currentUploadedImage.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(currentUploadedImage.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onImageChange?.(null)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files Status */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload Status</CardTitle>
            <p className="text-sm text-muted-foreground">
              {successfulUploads} of {uploadedFiles.length} files uploaded successfully
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{file.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  {file.status === 'error' && file.error && (
                    <p className="text-xs text-red-600 truncate">{file.error}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {file.status === 'uploading' && (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    </div>
                  )}
                  
                  {file.status === 'success' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-4 h-4" />
                      <span className="text-sm font-medium">Uploaded ✅</span>
                    </div>
                  )}
                  
                  {file.status === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <X className="w-4 h-4" />
                      <span className="text-sm font-medium">Failed ❌</span>
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Confirmation Step */}
      {(uploadedFiles.length > 0 || currentUploadedImage) && (
        <Card>
          <CardContent className="pt-6">
            {hasFailedUploads && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Some files failed to upload. Please remove failed uploads and try again.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-4">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border">
                <h3 className="font-semibold text-lg mb-2">Have you uploaded all your answer photos?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Double-check that all your written responses are uploaded before proceeding to evaluation.
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>📱 Mobile uploads: {successfulUploads} files</p>
                  {currentUploadedImage && <p>💻 Current image: {currentUploadedImage.name}</p>}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedFiles([]);
                    onImageChange?.(null);
                  }}
                  className="flex-1"
                >
                  Reset & Upload More
                </Button>
                <Button
                  onClick={handleConfirm}
                  disabled={!allFilesUploaded && !currentUploadedImage}
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
                Files uploaded from your phone will sync automatically and appear above. Keep this page open to see your uploads.
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};