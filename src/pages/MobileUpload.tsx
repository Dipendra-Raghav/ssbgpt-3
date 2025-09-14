import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, Check, X, ArrowLeft, Smartphone } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UploadedFile {
  file: File;
  id: string;
  status: 'uploading' | 'success' | 'error';
  url?: string;
  error?: string;
}

const MobileUpload = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [uploadSession, setUploadSession] = useState<any>(null);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate token and get session info
  useEffect(() => {
    const validateToken = async () => {
      console.log('MobileUpload: Checking token:', token);
      console.log('MobileUpload: Search params:', searchParams.toString());
      
      if (!token) {
        console.error('MobileUpload: No token found in URL parameters');
        setSessionValid(false);
        toast({
          title: 'Invalid Link',
          description: 'This upload link is missing a token. Please generate a new QR code.',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      try {
        // Validate the token by checking if session exists and is active
        const { data, error } = await supabase
          .from('upload_sessions')
          .select('*')
          .eq('token', token)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (error || !data) {
          setSessionValid(false);
          toast({
            title: 'Invalid or Expired Link',
            description: 'This upload link is invalid or has expired.',
            variant: 'destructive',
          });
          navigate('/');
          return;
        }

        setUploadSession(data);
        setSessionValid(true);
      } catch (error) {
        console.error('Error validating token:', error);
        setSessionValid(false);
        toast({
          title: 'Error',
          description: 'Failed to validate upload link.',
          variant: 'destructive',
        });
        navigate('/');
      }
    };

    validateToken();
  }, [token, navigate]);

  // Upload image via edge function (no auth required)
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!token || !uploadSession) return null;

    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('file', file);

      const response = await supabase.functions.invoke('mobile-upload', {
        body: formData
      });

      if (response.error) {
        throw new Error(response.error.message || 'Upload failed');
      }

      return response.data.url;
    } catch (error: any) {
      console.error('Upload error:', error);
      throw error;
    }
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (files.length + uploadedFiles.length > 5) {
      toast({
        title: 'Too Many Files',
        description: 'You can only upload up to 5 files.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // Create file entries with uploading status
    const newFiles: UploadedFile[] = files.map(file => ({
      file,
      id: crypto.randomUUID(),
      status: 'uploading' as const
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload each file
    for (const uploadFile of newFiles) {
      try {
        const url = await uploadImage(uploadFile.file);
        
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'success' as const, url }
              : f
          )
        );

        toast({
          title: 'Upload Successful',
          description: `${uploadFile.file.name} uploaded successfully.`,
        });
      } catch (error: any) {
        setUploadedFiles(prev => 
          prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error' as const, error: error.message }
              : f
          )
        );

        toast({
          title: 'Upload Failed',
          description: `Failed to upload ${uploadFile.file.name}. ${error.message}`,
          variant: 'destructive',
        });
      }
    }

    setIsUploading(false);
  };

  // Remove uploaded file
  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  // Show loading or error state
  if (sessionValid === null) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Validating upload link...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionValid === false) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Card>
          <CardContent className="pt-6 text-center">
            <Alert>
              <AlertDescription>
                This upload link is invalid or has expired.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate('/')} className="mt-4">
              Go to Main App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const successfulUploads = uploadedFiles.filter(f => f.status === 'success').length;
  const failedUploads = uploadedFiles.filter(f => f.status === 'error').length;

  return (
    <div className="container mx-auto p-6 max-w-md">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Main App
        </Button>
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Upload Your Answers</h1>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          Test: {uploadSession?.test_type?.toUpperCase()} • Session: {uploadSession?.session_id?.slice(-8)}
        </p>
      </div>

      {/* Upload Interface */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Capture or Upload Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={handleCameraCapture}
            disabled={isUploading}
            className="w-full h-16"
            size="lg"
          >
            <Camera className="w-6 h-6 mr-2" />
            Take Photo
          </Button>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            variant="outline"
            className="w-full h-12"
          >
            <Upload className="w-4 h-4 mr-2" />
            Choose from Gallery
          </Button>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Upload Status */}
      {uploadedFiles.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Uploaded Files</CardTitle>
            <p className="text-sm text-muted-foreground">
              {successfulUploads} uploaded, {failedUploads} failed
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
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  )}
                  
                  {file.status === 'success' && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                  
                  {file.status === 'error' && (
                    <X className="w-4 h-4 text-red-600" />
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

      {/* Success Message */}
      {successfulUploads > 0 && (
        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            {successfulUploads} file(s) uploaded successfully! 
            These will be automatically included in your test evaluation.
            You can continue uploading more files or return to the main app.
          </AlertDescription>
        </Alert>
      )}

      {/* Instructions */}
      <Card className="mt-6">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Tips for better uploads:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Ensure good lighting when taking photos</li>
            <li>• Keep the camera steady and avoid blur</li>
            <li>• Make sure all handwritten text is clearly visible</li>
            <li>• You can upload multiple photos of your answers</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileUpload;