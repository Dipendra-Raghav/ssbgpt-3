import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Image, 
  Timer, 
  Upload, 
  Play, 
  Camera, 
  FileImage, 
  SkipForward, 
  Square,
  Minimize2, 
  Maximize2,
  Send 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useTestPersistence } from '@/hooks/useTestPersistence';
import { useFullscreen } from '@/hooks/useFullscreen';
import { EvaluationLoading } from '@/components/ui/evaluation-loading';
import { useCredits } from '@/hooks/useCredits';
import { useSubscription } from '@/hooks/useSubscription';
import { CreditPopup } from '@/components/CreditPopup';
import { TestImageUpload } from '@/components/TestImageUpload';

interface PPDTImage {
  id: string;
  url: string;
  description: string;
}

const PPDT = () => {
  const { user } = useAuth();
  const { credits, fetchCredits, consumeCredit } = useCredits();
  const { hasActivePlan } = useSubscription();
  const [images, setImages] = useState<PPDTImage[]>([]);
  const [viewingTimeLeft, setViewingTimeLeft] = useState(30); // 30 seconds to view image
  const [writingTimeLeft, setWritingTimeLeft] = useState(240); // 4 minutes to write
  const [isViewingPhase, setIsViewingPhase] = useState(false);
  const [isWritingPhase, setIsWritingPhase] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCreditPopup, setShowCreditPopup] = useState(false);
  const { isFullscreen, isSupported, toggleFullscreen, enterFullscreen, exitFullscreen } = useFullscreen();
  const [isPaused, setIsPaused] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showCountSelector, setShowCountSelector] = useState(true);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [showViewingStartButton, setShowViewingStartButton] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [testInProgress, setTestInProgress] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  // Use persistence hook
  const { testState, updateTestState, resetTestState } = useTestPersistence('ppdt', {
    hasStarted: false,
    currentIndex: 0,
    completedCount: 0,
    responses: [],
    practiceCount: 1,
    sessionId: crypto.randomUUID(),
    story: '',
    writingTimeLeft: 240
  });

  const { hasStarted, currentIndex: currentImageIndex, completedCount, responses, practiceCount, sessionId, story } = testState;
  
  // Initialize writingTimeLeft from persistence if available
  useEffect(() => {
    if (testState.writingTimeLeft !== undefined) {
      setWritingTimeLeft(testState.writingTimeLeft);
    }
  }, [testState.writingTimeLeft]);

  // Restore UI state if test was already started
  useEffect(() => {
    if (hasStarted) {
      setShowCountSelector(false);
    }
  }, [hasStarted]);

  // Fullscreen exit handler - pause test
  useEffect(() => {
    if (testInProgress && !isFullscreen && isSupported) {
      setIsPaused(true);
      setIsViewingPhase(false);
      setIsWritingPhase(false);
      toast({
        title: 'Test Paused',
        description: 'Test paused due to exiting fullscreen mode.',
        variant: 'default',
      });
    }
  }, [isFullscreen, testInProgress, isSupported]);

  // Resume session if user returns mid-test
  useEffect(() => {
    const resume = async () => {
      if (hasStarted) {
        setShowCountSelector(false);
        if (images.length === 0) {
          await fetchImages();
        }
        
        // Restore timer states
        if (testState.viewingTimeLeft !== undefined) {
          setViewingTimeLeft(testState.viewingTimeLeft);
        }
        if (testState.writingTimeLeft !== undefined) {
          setWritingTimeLeft(testState.writingTimeLeft);
        }
        if (testState.isPaused !== undefined) {
          setIsPaused(testState.isPaused);
        }
        
        // Only show instructions if they haven't been shown yet
        if (!testState.instructionsShown && !isViewingPhase && !isWritingPhase && !isComplete && completedCount < practiceCount) {
          setShowInstructions(true);
        }
      }
    };
    resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted]);

  // Fetch random PPDT images for practice
  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('ppdt_images')
        .select('*')
        .limit(practiceCount);

      if (error) throw error;
      setImages(data || []);
      return data || [];
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load PPDT images. Please try again.',
        variant: 'destructive',
      });
      return [];
    }
  };

  // Upload image to storage
  const uploadImage = async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${sessionId}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('test-responses')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('test-responses')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: 'Upload Error',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Viewing timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isViewingPhase && viewingTimeLeft > 0 && !isPaused) {
      interval = setInterval(() => {
        setViewingTimeLeft(time => {
          const newTime = time - 1;
          // Persist timer state
          updateTestState({ viewingTimeLeft: newTime });
          
          if (newTime === 0) {
            setIsViewingPhase(false);
            setIsWritingPhase(true);
            setWritingTimeLeft(240);
            updateTestState({ writingTimeLeft: 240 });
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isViewingPhase, viewingTimeLeft, isPaused, updateTestState]);

  // Fallback to show start button if timer stalls
  useEffect(() => {
    if (isViewingPhase) {
      setShowViewingStartButton(false);
      const t = setTimeout(() => {
        if (viewingTimeLeft === 15) setShowViewingStartButton(true);
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [isViewingPhase, viewingTimeLeft]);

  // Writing timer logic - persist time when paused
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isWritingPhase && writingTimeLeft > 0 && !isPaused) {
      interval = setInterval(() => {
        setWritingTimeLeft(time => {
          const newTime = time - 1;
          // Save remaining time to persistence
          updateTestState({ writingTimeLeft: newTime });
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWritingPhase, writingTimeLeft, isPaused, updateTestState]);

  const [starting, setStarting] = useState(false);

  const checkCreditsAndStart = async () => {
    if (hasActivePlan()) {
      startTest();
      return;
    }

    // Validate requested count before consuming credits
    const maxImages = getMaxAllowedImages();
    if (practiceCount > maxImages) {
      toast({
        title: 'Credit Limit Exceeded',
        description: `You can only practice ${maxImages} images with your current credits.`,
        variant: 'destructive',
      });
      return;
    }

    if (!credits || credits.ppdt_credits <= 0) {
      setShowCreditPopup(true);
      return;
    }

    try {
      setStarting(true);
      const result = await consumeCredit('ppdt');
      if (result.success) {
        await startTest();
        await fetchCredits();
      } else {
        setShowCreditPopup(true);
      }
    } catch (error) {
      console.error('Error consuming credit:', error);
      setShowCreditPopup(true);
    } finally {
      setStarting(false);
    }
  };

  const getMaxAllowedImages = () => {
    if (hasActivePlan()) return 10; // Premium users can select up to 10
    if (!credits) return 1;
    
    // Free users limited by their remaining credits
    return Math.min(credits.ppdt_credits, 5);
  };

  const startTest = async () => {
    const maxImages = getMaxAllowedImages();
    if (practiceCount > maxImages) {
      toast({
        title: 'Credit Limit Exceeded',
        description: `You can only practice ${maxImages} images with your current credits.`,
        variant: 'destructive',
      });
      return;
    }

    setShowCountSelector(false);
    const fetchedImages = await fetchImages();
    if (fetchedImages.length > 0) {
      updateTestState({ 
        hasStarted: true,
        practiceCount
      });
      setTestInProgress(true);
      setShowInstructions(true);

      // Enter fullscreen mode
      if (isSupported) {
        await enterFullscreen();
      }

      toast({
        title: 'PPDT Practice Started!',
        description: `Get ready to analyze ${practiceCount} images.`,
      });
    }
  };

  const finishEarlyTest = async () => {
    updateTestState({
      completedCount: practiceCount  // Mark as complete
    });
    setTestInProgress(false);
    setIsViewingPhase(false);
    setIsWritingPhase(false);
    setIsComplete(false);
    setIsPaused(false);
    
    // Exit fullscreen
    if (isFullscreen && isSupported) {
      await exitFullscreen();
    }
    
    toast({
      title: 'Test Finished Early',
      description: `You completed ${responses.length} out of ${practiceCount} images.`,
    });
  };

  const skipCurrentImage = () => {
    if (isViewingPhase) {
      setIsViewingPhase(false);
      setIsWritingPhase(true);
      setWritingTimeLeft(240);
    } else if (isWritingPhase) {
      setIsWritingPhase(false);
      setIsComplete(true);
    }
  };

  const startActualTest = () => {
    setShowInstructions(false);
    setIsViewingPhase(true);
    setViewingTimeLeft(30);
    // Mark instructions as shown and persist state
    updateTestState({ 
      instructionsShown: true,
      viewingTimeLeft: 30,
      isPaused: false
    });
  };

  const preventNavigation = (e: BeforeUnloadEvent) => {
    if (testInProgress) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', preventNavigation);
    return () => window.removeEventListener('beforeunload', preventNavigation);
  }, [testInProgress]);

  const submitResponse = async () => {
    if (!images[currentImageIndex] || !user) return;

    setLoading(true);
    try {
      let imageUrl = null;
      if (uploadedImage) {
        imageUrl = await uploadImage(uploadedImage);
      }

      const { data: savedResponse, error } = await supabase
        .from('test_responses')
        .insert({
          user_id: user.id,
          test_type: 'ppdt',
          response_text: story,
          response_image_url: imageUrl,
          image_id: images[currentImageIndex].id,
          session_id: sessionId,
          time_taken: 240 - writingTimeLeft // Total time - remaining time
        })
        .select()
        .single();

      if (error) throw error;
      
      const newResponses = [...responses, savedResponse];
      const newCompletedCount = completedCount + 1;

      toast({
        title: 'Response Submitted!',
        description: 'Your PPDT response has been saved successfully.',
      });

      if (newCompletedCount < practiceCount && currentImageIndex < images.length - 1) {
        // Start next image
        updateTestState({
          currentIndex: currentImageIndex + 1,
          completedCount: newCompletedCount,
          responses: newResponses,
          story: ''
        });
        setUploadedImage(null);
        setIsComplete(false);
        setIsViewingPhase(true);
        setViewingTimeLeft(30);
      } else {
        // All images completed
        updateTestState({
          completedCount: newCompletedCount,
          responses: newResponses
        });
        setTestInProgress(false);
        setIsComplete(true);
        toast({
          title: 'Practice Complete!',
          description: `You have completed all ${practiceCount} PPDT practice images.`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Submission Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    resetTestState();
    setShowCountSelector(true);
    setIsViewingPhase(false);
    setIsWritingPhase(false);
    setIsComplete(false);
    setUploadedImage(null);
    setViewingTimeLeft(30);
    setWritingTimeLeft(240);
    setTestInProgress(false);
    setShowInstructions(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImage(file);
      toast({
        title: 'Image Selected',
        description: 'Image ready for upload with your response.',
      });
    }
  };

  const currentImage = images[currentImageIndex];
  const viewingProgress = ((30 - viewingTimeLeft) / 30) * 100;
  const writingProgress = ((240 - writingTimeLeft) / 240) * 100;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Picture Perception & Description Test (PPDT)
        </h1>
        <p className="text-muted-foreground">
          Observe each image for 30 seconds, then write a story in 4 minutes. You can also upload a handwritten response.
        </p>
      </div>

      {showCountSelector ? (
        <Card className="text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-gradient-primary rounded-2xl">
                <Image className="w-12 h-12 text-primary-foreground" />
              </div>
            </div>
            <CardTitle>How many images would you like to practice?</CardTitle>
            <CardDescription>
              Select the number of PPDT images you want to practice with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="practiceCount">Number of Images</Label>
              <Input
                id="practiceCount"
                type="number"
                min="1"
                max={getMaxAllowedImages()}
                value={practiceCount}
                onChange={(e) => {
                  const value = Math.max(1, Math.min(getMaxAllowedImages(), parseInt(e.target.value) || 1));
                  updateTestState({ practiceCount: value });
                }}
                className="w-32 text-center"
              />
              <p className="text-xs text-muted-foreground">
                Max: {getMaxAllowedImages()} images {!hasActivePlan() && '(based on your credits)'}
              </p>
            </div>
            <Button onClick={checkCreditsAndStart} size="lg" className="shadow-command" disabled={starting}>
              <Play className="w-4 h-4 mr-2" />
              {starting ? 'Starting…' : `Start PPDT Practice (${practiceCount} images)`}
            </Button>
          </CardContent>
        </Card>
      ) : !hasStarted ? (
        <Card className="text-center">
          <CardContent className="p-8">
            <p className="text-muted-foreground">Loading images...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Test Controls with Timer */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg">
                    <Timer className="w-4 h-4 text-primary" />
                    <span className="font-mono text-lg font-bold">
                      {isViewingPhase ? `${viewingTimeLeft}s` : 
                       isWritingPhase ? `${Math.floor(writingTimeLeft / 60)}:${(writingTimeLeft % 60).toString().padStart(2, '0')}` : ''}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {currentImageIndex + 1}/{practiceCount}
                    </span>
                  </div>
                  {isPaused && (
                    <span className="text-sm text-amber-500 font-medium">PAUSED</span>
                  )}
                </div>
                <div className="flex gap-2">
                   <Button
                     variant="outline"
                     size="sm"
                     onClick={() => {
                       if (isPaused) {
                         setIsPaused(false);
                         updateTestState({ isPaused: false });
                         
                         if (!testState.instructionsShown) {
                           setShowInstructions(true);
                         } else {
                           // Resume directly to the appropriate phase
                           if (testState.viewingTimeLeft && testState.viewingTimeLeft > 0) {
                             setIsViewingPhase(true);
                           } else if (testState.writingTimeLeft && testState.writingTimeLeft > 0) {
                             setIsWritingPhase(true);
                           }
                         }
                         
                         if (isSupported && !isFullscreen) {
                           enterFullscreen();
                         }
                         toast({
                           title: 'Test Resumed',
                           description: 'Your test has been resumed.',
                         });
                       } else {
                         setIsPaused(true);
                         setIsViewingPhase(false);
                         setIsWritingPhase(false);
                         updateTestState({ isPaused: true });
                         toast({
                           title: 'Test Paused',
                           description: 'Test has been paused.',
                         });
                       }
                     }}
                     disabled={!testInProgress}
                   >
                     {isPaused ? 'Resume Test' : 'Pause Test'}
                   </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={!testInProgress}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Finish Early
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Finish Test Early?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to finish the test early? You will be evaluated based on the {completedCount} images you have completed so far.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={finishEarlyTest}>
                          Yes, Finish Test
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Instructions Screen */}
          {showInstructions && (
            <Card className="text-center border-primary">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">PPDT Instructions</CardTitle>
                <CardDescription>Read carefully before starting the test</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-left space-y-4 max-w-2xl mx-auto">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary">Test Process:</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>You will be shown a picture for <strong>30 seconds</strong>.</li>
                      <li>Observe carefully: note characters, their age, gender, mood, and actions.</li>
                      <li>Write a story in <strong>4 minutes</strong> describing:
                        <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                          <li>What led to the situation (past)</li>
                          <li>What is happening now (present)</li>
                          <li>What might happen next (future)</li>
                        </ul>
                      </li>
                    </ol>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary">Story Guidelines:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Ensure your story is <strong>clear and logical</strong></li>
                      <li><strong>Positive in tone</strong> (avoid extreme violence or negativity)</li>
                      <li>Include characters' <strong>feelings, intentions, and actions</strong></li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-primary">Platform Options:</h4>
                    <p className="text-sm">On this platform, you can either:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li><strong>Type your response directly</strong>, OR</li>
                      <li><strong>Skip and upload a handwritten story</strong> at the end</li>
                    </ul>
                  </div>
                </div>
                
                <Button onClick={startActualTest} size="lg" className="shadow-command">
                  <Play className="w-4 h-4 mr-2" />
                  Continue Test
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Prep/Resume */}
          {hasStarted && completedCount < practiceCount && (!isViewingPhase && !isWritingPhase && !isComplete && !showInstructions) && isPaused && (
            <Card className="text-center">
              <CardContent className="p-8">
                <p className="text-muted-foreground mb-4">
                  Test paused. Click to continue in fullscreen mode.
                </p>
                 <Button variant="outline" onClick={async () => {
                   setIsPaused(false);
                   updateTestState({ isPaused: false });
                   
                   // Only show instructions if they haven't been shown before
                   if (!testState.instructionsShown) {
                     setShowInstructions(true);
                   } else {
                     // Resume directly to the appropriate phase
                     if (testState.viewingTimeLeft && testState.viewingTimeLeft > 0) {
                       setIsViewingPhase(true);
                     } else if (testState.writingTimeLeft && testState.writingTimeLeft > 0) {
                       setIsWritingPhase(true);
                     }
                   }
                   
                   if (isSupported && !isFullscreen) {
                     await enterFullscreen();
                   }
                   toast({
                     title: 'Test Resumed',
                     description: 'Your test has been resumed.',
                   });
                 }}>
                  Continue Test
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Viewing Phase */}
          {isViewingPhase && (
            <Card>
              <CardHeader>
                <CardTitle>Observe the Image</CardTitle>
                <CardDescription>Study this image carefully for the remaining time.</CardDescription>
              </CardHeader>
              <CardContent>
                {showViewingStartButton && (
                  <div className="flex justify-center mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setViewingTimeLeft((t) => Math.max(14, t - 1)); setShowViewingStartButton(false); }}
                    >
                      Start viewing timer
                    </Button>
                  </div>
                )}
                {currentImage ? (
                  <div>
                    <div className="flex justify-center">
                      <div className="max-w-md w-full">
                        <img
                          src={currentImage.url}
                          alt="PPDT Test Image"
                          className="w-full h-auto rounded-lg border-2 border-border"
                        />
                      </div>
                    </div>
                    
                    {/* Next Button during observation */}
                    <div className="flex justify-center mt-4">
                      <Button
                       onClick={() => {
                         setIsViewingPhase(false);
                         setIsWritingPhase(true);
                         setWritingTimeLeft(240);
                         updateTestState({ viewingTimeLeft: 0, writingTimeLeft: 240 });
                       }}
                        variant="outline"
                        size="sm"
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Next (Skip to Writing)
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">Loading image...</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Writing Phase */}
          {isWritingPhase && (
            <Card>
              <CardHeader>
                <CardTitle>Write Your Story</CardTitle>
                <CardDescription>
                  Create a story with a clear beginning, middle, and end. Include a hero and a clear theme.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Start writing your story here... Remember to include characters, setting, action, and outcome."
                  value={story}
                  onChange={(e) => updateTestState({ story: e.target.value })}
                  className="min-h-[200px]"
                  disabled={writingTimeLeft === 0}
                />

                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Characters: {story.length} | Words: {story.split(' ').filter(word => word.length > 0).length}
                    </p>
                    <Button 
                      onClick={() => {
                        setIsWritingPhase(false);
                        setIsComplete(true);
                      }}
                      className="shadow-command"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Next
                    </Button>
                  </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Phase */}
          {isComplete && completedCount < practiceCount && (
            <Card>
              <CardHeader>
                <CardTitle>Ready for Next Image</CardTitle>
                <CardDescription>
                  Your response has been saved. Continue to the next image.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={submitResponse} 
                  disabled={loading}
                  className="shadow-command"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {loading ? 'Moving to Next...' : 'Continue to Next Image'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Test Complete */}
          {completedCount >= practiceCount && (
            <Card>
              <CardHeader>
                <CardTitle>PPDT Practice Complete!</CardTitle>
                <CardDescription>
                  You have successfully completed all {practiceCount} images. Upload an image if you have handwritten responses, then get your evaluation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enhanced Image Upload Section */}
                <div className="border-t pt-4">
                  <TestImageUpload
                    onFilesUploaded={(files) => {
                      // For now, set the first file as the uploaded image for backward compatibility
                      if (files.length > 0) {
                        setUploadedImage(files[0]);
                      }
                    }}
                    sessionId={sessionId}
                    testType="ppdt"
                    maxFiles={3}
                    currentUploadedImage={uploadedImage}
                    onImageChange={setUploadedImage}
                  />
                </div>

                {evaluationError && (
                  <div className="w-full p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{evaluationError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setEvaluationError(null)}
                      className="mt-2"
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
                <div className="flex gap-3">
                   <Button 
                     onClick={async () => {
                       try {
                         setEvaluationLoading(true);
                         setEvaluationError(null);
                         
                           console.log('Processing evaluation for:', { userId: user?.id, testType: 'ppdt', responseCount: responses.length });
                           
                           let finalImageUrl = null;
                           
                           // Always check for any images first - prioritize session uploads for mobile
                           console.log('Image check:', { hasUploadedImage: !!uploadedImage, uploadedImageSize: uploadedImage?.size });
                           
                           // First check for mobile uploads regardless of uploadedImage state
                           const { data: mobileUploads, error: uploadError } = await supabase
                             .from('session_uploads')
                             .select('public_url')
                             .eq('session_id', sessionId)
                             .order('created_at', { ascending: false })
                             .limit(1);
                             
                           if (!uploadError && mobileUploads && mobileUploads.length > 0) {
                             finalImageUrl = mobileUploads[0].public_url;
                             console.log('Using mobile-uploaded image URL:', finalImageUrl);
                           } else if (uploadedImage && uploadedImage.size > 0) {
                             // Only upload computer-selected file if no mobile uploads found
                             console.log('Uploading computer-selected image...');
                             finalImageUrl = await uploadImage(uploadedImage);
                             console.log('Computer image uploaded:', finalImageUrl);
                           }

                          const responseIds = responses.map(r => r.id);
                          console.log('Calling OpenAI evaluation with:', { userId: user?.id, testType: 'ppdt', responseIds, finalImageUrl });
                          
                          const { data, error } = await supabase.functions.invoke('openai-evaluation', {
                            body: { 
                              userId: user?.id, 
                              testType: 'ppdt', 
                              responseIds,
                              finalImageUrl
                            }
                          });
                          
                          console.log('Evaluation response:', { data, error });
                          
                          if (error) {
                            console.error('Supabase function error:', error);
                            throw error;
                          }
                         
                          // Clean up uploaded images
                          try {
                            await supabase.functions.invoke('delete-test-images', {
                              body: { sessionId, testType: 'ppdt' }
                            });
                          } catch (cleanupError) {
                            console.warn('Failed to cleanup images:', cleanupError);
                          }

                          // Show success message before redirecting
                          toast({
                            title: "Evaluation Complete!",
                            description: "Your PPDT test has been evaluated successfully.",
                          });
                          
                          // Auto-redirect to results page after a short delay
                          setTimeout(() => {
                            window.location.href = '/results';
                          }, 1500);
                       } catch (error: any) {
                         console.error('Evaluation error:', error);
                         setEvaluationError(error.message || 'Failed to get evaluation. Please try again.');
                         toast({ 
                           title: "Error", 
                           description: error.message || "Failed to get evaluation.", 
                           variant: "destructive" 
                         });
                       } finally {
                         setEvaluationLoading(false);
                       }
                     }}
                     className="shadow-command flex-1"
                     disabled={evaluationLoading}
                   >
                     <Send className="w-4 h-4 mr-2" />
                     Submit Test & Get Evaluation
                   </Button>
                   <Button variant="outline" onClick={resetTest}>
                     Practice Again
                   </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {/* Evaluation Loading Modal */}
      <EvaluationLoading 
        isOpen={evaluationLoading} 
        message="Analyzing your PPDT responses... Please wait while AI evaluates your test."
      />
      
      {/* Credit Popup */}
      <CreditPopup
        isOpen={showCreditPopup}
        onClose={() => setShowCreditPopup(false)}
        testType="ppdt"
        creditsLeft={credits?.ppdt_credits || 0}
      />
    </div>
  );
};

export default PPDT;