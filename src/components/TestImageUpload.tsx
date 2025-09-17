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
import { MinimalUploadDisplay } from './MinimalUploadDisplay';
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

  // Listen for real-time uploads from mobile and session status
  useEffect(() => {
    const uploadsChannel = supabase
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
          const upload = payload.new as any;
          
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
          setShowQRDialog(false);
          
          toast({
            title: 'Mobile Upload Received',
            description: 'File uploaded from your phone successfully!',
          });
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel('upload-session-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'upload_sessions',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          const isActive = (payload.new as any)?.is_active;
          if (isActive === false) {
            setShowQRDialog(false);
            toast({
              title: 'Mobile Session Closed',
              description: 'You can now proceed to evaluation.',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(uploadsChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId]);

  // Generate QR code for mobile upload
  const generateQRCode = async () => {
    try {
      console.log('Creating upload session for:', { sessionId, testType });
      
      // Create upload session via edge function
      const { data, error } = await supabase.functions.invoke('create-upload-session', {
        body: { sessionId, testType }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create upload session');
      }

      if (!data || !data.uploadUrl) {
        console.error('Invalid response from create-upload-session:', data);
        throw new Error('Invalid response from upload session creation');
      }

      console.log('Generated upload URL:', data.uploadUrl);
      
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
        description: `Failed to generate QR code: ${error.message}`,
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
                  {isUploading ? (
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <QrCode className="w-6 h-6" />
                  )}
                  <span className="text-sm">
                    {isUploading ? 'Generating QR...' : 'Scan QR to Upload from Phone'}
                  </span>
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

      {/* Minimal Upload Display */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="mb-3">
              <p className="text-sm font-medium">
                Upload Status ({successfulUploads} of {uploadedFiles.length} files uploaded)
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
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Some uploads failed. Remove failed files and try again.
                </AlertDescription>
              </Alert>
            )}
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
            
            <div className="space-y-4">{/* Mobile upload info removed as requested */}
              
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setUploadedFiles([]);
                    onImageChange?.(null);
                  }}
                >
                  Reset & Upload More
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