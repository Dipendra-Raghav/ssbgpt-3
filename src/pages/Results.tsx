import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSearchParams } from 'react-router-dom';
import { 
  Image,
  Zap,
  Target,
  ChevronRight,
  ChevronDown,
  Calendar,
  AlertTriangle,
  Star,
  TrendingDown,
  MessageSquare,
  Edit3
} from 'lucide-react';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TestResponse {
  id: string;
  response_text: string;
  response_image_url?: string;
  image_id: string;
  created_at: string;
  wat_words?: { word: string };
  srt_situations?: { situation_text: string };
  ppdt_images?: { url: string; description?: string };
}

interface Evaluation {
  id: string;
  test_type: string;
  score?: number;
  overall_score: number;
  analysis?: string;
  detailed_analysis: {
    individual_analysis: Array<{
      word?: string;
      situation?: string;
      user_response: string;
      score: number;
      analysis: string;
      improved_response_1?: string;
      improved_response_2?: string;
      improved_response_3?: string;
      improved_response?: string; // Legacy field
    }>;
    raw_evaluation: any;
  };
  created_at: string;
  session_id?: string;
}

interface TestEvaluation {
  testType: string;
  evaluations: Evaluation[];
  totalCount: number;
}

const Results = () => {
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [testResponses, setTestResponses] = useState<{ [key: string]: TestResponse[] }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ppdt');
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<string>>(new Set());
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('test') || 'wat';

  const fetchEvaluations = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('evaluations')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEvaluations(data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch evaluations.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchTestResponses = useCallback(async (evaluation: Evaluation) => {
    if (!evaluation.session_id) return;
    
    try {
      const { data, error } = await supabase
        .from('test_responses')
        .select(`
          *,
          wat_words(word),
          srt_situations(situation_text),
          ppdt_images(url, description)
        `)
        .eq('user_id', user?.id)
        .eq('test_type', evaluation.test_type)
        .eq('session_id', evaluation.session_id);

      if (error) throw error;
      
      setTestResponses(prev => ({
        ...prev,
        [evaluation.id]: data || []
      }));
    } catch (error: unknown) {
      console.error('Error fetching test responses:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      fetchEvaluations();
    }
  }, [user, fetchEvaluations]);

  useEffect(() => {
    // Fetch test responses for each evaluation
    evaluations.forEach(evaluation => {
      if (evaluation.session_id && !testResponses[evaluation.id]) {
        fetchTestResponses(evaluation);
      }
    });
  }, [evaluations, fetchTestResponses, testResponses]);

  const getTestEvaluations = (testType: string): TestEvaluation => {
    const testEvaluations = evaluations.filter(e => e.test_type === testType);
    return {
      testType,
      evaluations: testEvaluations,
      totalCount: testEvaluations.length
    };
  };

  const toggleEvaluationExpansion = (evaluationId: string) => {
    const newExpanded = new Set(expandedEvaluations);
    if (newExpanded.has(evaluationId)) {
      newExpanded.delete(evaluationId);
    } else {
      newExpanded.add(evaluationId);
    }
    setExpandedEvaluations(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreBadge = (score: number) => {
    if (score >= 4) return 'default';
    if (score >= 3) return 'secondary';
    return 'destructive';
  };

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600';
    if (score >= 3) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderIndividualAnalysis = (evaluation: Evaluation) => {
    const individualAnalysis = evaluation.detailed_analysis?.individual_analysis || [];
    const responses = testResponses[evaluation.id] || [];
    
    if (individualAnalysis.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No individual response analysis available.</p>
          <p className="text-sm">This evaluation was processed before individual analysis was implemented.</p>
        </div>
      );
    }

    // Handle PPDT with consistent layout like WAT/SRT
    if (evaluation.test_type === 'ppdt') {
      return (
        <div className="space-y-4">
          {individualAnalysis.map((item, index) => {
            // Use image_url from the OpenAI edge function output
            const imageUrl = (item as any).image_url;
            const ppdtItem = item as any;
            const score = ppdtItem.score || 0;

            return (
              <div key={index} className="border rounded-lg p-4 bg-card">
                {/* Image at the top */}
                <div className="relative flex flex-col items-center justify-center mb-4">
                  {imageUrl && (
                    <div className="relative w-full flex justify-center">
                      <img
                        src={imageUrl}
                        alt={`PPDT stimulus image ${index + 1}`}
                        className="rounded-lg w-full max-w-sm mx-auto"
                      />
                      <Badge
                        variant={getScoreBadge(score)}
                        className="absolute top-4 right-4 z-10"
                      >
                        Score: {score}/5
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="bg-muted p-3 rounded border">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Your Response:</span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {ppdtItem.user_story || ppdtItem.user_response || 'No story provided'}
                    </p>
                  </div>

                  {/* Analysis, Pros, Cons - show if score is 4 or below */}
                  {score <= 4 && (
                    <>
                      {ppdtItem.analysis && (
                        <div className="p-3 rounded border bg-destructive/10 border-destructive/30">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Analysis:</span>
                          </div>
                          <p className="text-sm text-destructive/90">{ppdtItem.analysis}</p>
                        </div>
                      )}

                      {ppdtItem.pros && (
                        <div className="p-3 rounded border bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800">
                          <div className="flex items-center gap-2 mb-1">
                            <Star className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-600">Strengths:</span>
                          </div>
                          <p className="text-sm text-green-700 dark:text-green-300">{ppdtItem.pros}</p>
                        </div>
                      )}

                      {ppdtItem.cons && (
                        <div className="p-3 rounded border bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingDown className="w-4 h-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-600">Areas for Improvement:</span>
                          </div>
                          <p className="text-sm text-orange-700 dark:text-orange-300">{ppdtItem.cons}</p>
                        </div>
                      )}

                      {/* PIQ Relevance Analysis */}
                      {ppdtItem.piq_relevance && (
                        <div className="p-3 rounded border bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
                          <div className="flex items-center gap-2 mb-1">
                            <Edit3 className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-600">PIQ Relevance Analysis:</span>
                          </div>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{ppdtItem.piq_relevance}</p>
                        </div>
                      )}

                      {/* Improved Stories in Horizontal Tabs */}
                      {(ppdtItem.improved_story_1 || ppdtItem.improved_story_2) && (
                        <div className="mt-4">
                          <Tabs defaultValue="story1" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                              <TabsTrigger value="story1">Improved Response 1</TabsTrigger>
                              <TabsTrigger value="story2">Improved Response 2</TabsTrigger>
                            </TabsList>
                            <TabsContent value="story1" className="mt-4">
                              <div className="p-3 rounded border bg-green-500/10 border-green-500/30">
                                <p className="text-sm text-green-300 whitespace-pre-wrap">
                                  {ppdtItem.improved_story_1 || 'No improved story available'}
                                </p>
                              </div>
                            </TabsContent>
                            <TabsContent value="story2" className="mt-4">
                              <div className="p-3 rounded border bg-green-500/10 border-green-500/30">
                                <p className="text-sm text-green-300 whitespace-pre-wrap">
                                  {ppdtItem.improved_story_2 || 'No improved story available'}
                                </p>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      )}
                    </>
                  )}

                  {/* Great response message for high scores */}
                  {score > 4 && (
                    <div className="p-3 rounded border bg-green-500/10 border-green-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-green-400" />
                        <span className="text-sm font-medium text-green-400">Great Response!</span>
                      </div>
                      <p className="text-sm text-green-300">
                        This response scored well above average. Keep up the good work!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Handle WAT and SRT (existing logic)
    return (
      <div className="space-y-4">
        {individualAnalysis.map((item, index) => {
          const response = responses[index];
          const testContent = evaluation.test_type === 'wat' 
            ? item.word || response?.wat_words?.word || 'Unknown word'
            : item.situation || response?.srt_situations?.situation_text || 'Unknown situation';
          
          return (
<div key={index} className="border rounded-lg p-4 bg-card">
  <div className="flex items-center justify-between mb-3">
    <h5 className="font-semibold text-foreground">
      {evaluation.test_type === 'wat' ? 'Word' : 'Situation'}: {testContent}
    </h5>
    <Badge variant={getScoreBadge(item.score)}>Score: {item.score}/5</Badge>
  </div>

  <div className="space-y-3">
    <div className="bg-muted p-3 rounded border">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Your Response:</span>
      </div>
      <p className="text-sm text-muted-foreground">{item.user_response}</p>
    </div>

    {item.score <= 4 && (
      <>
        <div className="p-3 rounded border bg-destructive/10 border-destructive/30">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">Analysis:</span>
          </div>
          <p className="text-sm text-destructive/90">{item.analysis}</p>
        </div>

        {(item.improved_response_1 || item.improved_response_2 || item.improved_response_3) && (
          <div className="p-3 rounded border bg-green-500/10 border-green-500/30">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-green-300" />
              <span className="text-sm font-medium text-green-300">Improved Responses:</span>
            </div>
            <div className="space-y-2">
              {item.improved_response_1 && (
                <p className="text-sm text-green-300"><span className="font-bold">1)</span> {item.improved_response_1}</p>
              )}
              {item.improved_response_2 && (
                <p className="text-sm text-green-300"><span className="font-bold">2)</span> {item.improved_response_2}</p>
              )}
              {item.improved_response_3 && (
                <p className="text-sm text-green-300"><span className="font-bold">3)</span> {item.improved_response_3}</p>
              )}
            </div>
          </div>
        )}
      </>
    )}

    {item.score > 4 && (
      <div className="p-3 rounded border bg-green-500/10 border-green-500/30">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">Great Response!</span>
        </div>
        <p className="text-sm text-green-300">
          This response scored well above average. Keep up the good work!
        </p>
      </div>
    )}
  </div>
</div>

          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading results...</span>
        </div>
      </div>
    );
  }

  const ppdtData = getTestEvaluations('ppdt');
  const watData = getTestEvaluations('wat');
  const srtData = getTestEvaluations('srt');

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Your Test Results
        </h1>
        <p className="text-xl text-muted-foreground">
          Individual evaluation analysis for each test attempt
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ppdt" className="flex items-center gap-2">
            <Image className="w-4 h-4" />
            PPDT ({ppdtData.totalCount})
          </TabsTrigger>
          <TabsTrigger value="wat" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            WAT ({watData.totalCount})
          </TabsTrigger>
          <TabsTrigger value="srt" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            SRT ({srtData.totalCount})
          </TabsTrigger>
        </TabsList>

        {/* PPDT Tab - Only Detailed Feedback */}
        <TabsContent value="ppdt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="w-6 h-6 text-blue-600" />
                PPDT Test Results
              </CardTitle>
              <CardDescription>
                Picture Perception & Description Test Evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {ppdtData.evaluations.length > 0 ? (
                <div className="space-y-4">
                  {ppdtData.evaluations.map((evaluation) => (
                    <Collapsible key={evaluation.id}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            PPDT Evaluation – {formatDate(evaluation.created_at)}
                          </div>
                          <div className="flex items-center gap-2">
                              <Badge variant={getScoreBadge(evaluation.overall_score || 0)}>
                                Overall Score: {evaluation.overall_score != null ? evaluation.overall_score : 'N/A'}/5
                              </Badge>
                            {expandedEvaluations.has(evaluation.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <Card>
                          <CardContent className="pt-4">
                            {/* Only show detailed feedback */}
                            {renderIndividualAnalysis(evaluation)}
                          </CardContent>
                        </Card>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No PPDT evaluations yet.</p>
                  <p className="text-sm">Complete a PPDT test to see your results here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WAT Tab - Only Detailed Feedback */}
        <TabsContent value="wat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-green-600" />
                WAT Test Results
              </CardTitle>
              <CardDescription>
                Word Association Test Evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watData.evaluations.length > 0 ? (
                <div className="space-y-4">
                  {watData.evaluations.map((evaluation) => (
                    <Collapsible key={evaluation.id}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            WAT Evaluation – {formatDate(evaluation.created_at)}
                          </div>
                          <div className="flex items-center gap-2">
                              <Badge variant={getScoreBadge(evaluation.overall_score || 0)}>
                                Overall Score: {evaluation.overall_score != null ? evaluation.overall_score : 'N/A'}/5
                              </Badge>
                            {expandedEvaluations.has(evaluation.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <Card>
                          <CardContent className="pt-4">
                            {/* Only show detailed feedback */}
                            {renderIndividualAnalysis(evaluation)}
                          </CardContent>
                        </Card>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No WAT evaluations yet.</p>
                  <p className="text-sm">Complete a WAT test to see your results here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SRT Tab - Only Detailed Feedback */}
        <TabsContent value="srt" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-6 h-6 text-purple-600" />
                SRT Test Results
              </CardTitle>
              <CardDescription>
                Situation Reaction Test Evaluations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {srtData.evaluations.length > 0 ? (
                <div className="space-y-4">
                  {srtData.evaluations.map((evaluation) => (
                    <Collapsible key={evaluation.id}>
                      <CollapsibleTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            SRT Evaluation – {formatDate(evaluation.created_at)}
                          </div>
                          <div className="flex items-center gap-2">
                              <Badge variant={getScoreBadge(evaluation.overall_score || 0)}>
                                Overall Score: {evaluation.overall_score != null ? evaluation.overall_score : 'N/A'}/5
                              </Badge>
                            {expandedEvaluations.has(evaluation.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <Card>
                          <CardContent className="pt-4">
                            {/* Only show detailed feedback */}
                            {renderIndividualAnalysis(evaluation)}
                          </CardContent>
                        </Card>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No SRT evaluations yet.</p>
                  <p className="text-sm">Complete an SRT test to see your results here.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Results;
