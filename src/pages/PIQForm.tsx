import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, FileText, User, GraduationCap, Trophy, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient as supabase } from "@/lib/supabase-client";
import { Navigate } from "react-router-dom";

const piqSchema = z.object({
  // Personal Information
  selectionBoard: z.string().trim().min(1, "Selection Board is required"),
  batchNo: z.string().trim().min(1, "Batch No is required"),
  chestNo: z.string().trim().min(1, "Chest No is required"),
  rollNo: z.string().trim().min(1, "Roll No is required"),
  fullName: z.string().trim().min(1, "Full Name is required"),
  fatherName: z.string().trim().min(1, "Father's Name is required"),
  
  // Residence Information
  maxResidencePlace: z.string().trim().min(1, "Place of Maximum Residence is required"),
  maxResidenceDistrict: z.string().trim().min(1, "District is required"),
  maxResidenceState: z.string().trim().min(1, "State is required"),
  maxResidencePopulation: z.string().trim().min(1, "Population is required"),
  
  presentResidencePlace: z.string().trim().min(1, "Present Residence Place is required"),
  presentResidenceDistrict: z.string().trim().min(1, "District is required"),
  presentResidenceState: z.string().trim().min(1, "State is required"),
  presentResidencePopulation: z.string().trim().min(1, "Population is required"),
  
  permanentResidencePlace: z.string().trim().min(1, "Permanent Residence Place is required"),
  permanentResidenceDistrict: z.string().trim().min(1, "District is required"),
  permanentResidenceState: z.string().trim().min(1, "State is required"),
  permanentResidencePopulation: z.string().trim().min(1, "Population is required"),
  
  isDistrictHQ: z.enum(["yes", "no"]),
  
  // Family Background
  parentsAlive: z.enum(["yes", "no"]),
  motherDeathAge: z.string().trim().optional(),
  fatherDeathAge: z.string().trim().optional(),
  
  fatherOccupation: z.string().trim().min(1, "Father's occupation is required"),
  fatherIncome: z.string().trim().min(1, "Father's income is required"),
  motherOccupation: z.string().trim().min(1, "Mother's occupation is required"),
  motherIncome: z.string().trim().min(1, "Mother's income is required"),
  
  // Physical Details
  ageYears: z.string().trim().min(1, "Age in years is required"),
  ageMonths: z.string().trim().min(1, "Age in months is required"),
  height: z.string().trim().min(1, "Height is required"),
  weight: z.string().trim().min(1, "Weight is required"),
  
  // Current Status
  presentOccupation: z.string().trim().min(1, "Present occupation is required"),
  personalIncome: z.string().trim().min(1, "Personal income is required"),
  nccTraining: z.enum(["yes", "no"]),
  nccDetails: z.string().trim().optional(),
  
  // Activities
  gamesAndSports: z.string().trim().min(1, "Games & Sports details are required"),
  hobbies: z.string().trim().min(1, "Hobbies are required"),
  extraCurricularActivities: z.string().trim().min(1, "Extra-curricular activities are required"),
  positionsOfResponsibility: z.string().trim().min(1, "Positions of responsibility are required"),
  
  // Commission Preferences
  commissionNature: z.string().trim().min(1, "Nature of commission is required"),
  serviceChoice: z.enum(["army", "navy", "airforce"]),
  previousAttempts: z.string().trim().min(1, "Number of attempts is required"),
  previousSSBDetails: z.string().trim().optional(),
});

type PIQFormData = z.infer<typeof piqSchema>;

interface PIQFormProps {
  onComplete?: () => void;
  onCancel?: () => void;
  isEdit?: boolean;
}

const PIQForm = ({ onComplete, onCancel, isEdit = false }: PIQFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentSection, setCurrentSection] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const form = useForm<PIQFormData>({
    resolver: zodResolver(piqSchema),
    defaultValues: {
      selectionBoard: "",
      batchNo: "",
      chestNo: "",
      rollNo: "",
      fullName: "",
      fatherName: "",
      maxResidencePlace: "",
      maxResidenceDistrict: "",
      maxResidenceState: "",
      maxResidencePopulation: "",
      presentResidencePlace: "",
      presentResidenceDistrict: "",
      presentResidenceState: "",
      presentResidencePopulation: "",
      permanentResidencePlace: "",
      permanentResidenceDistrict: "",
      permanentResidenceState: "",
      permanentResidencePopulation: "",
      isDistrictHQ: "no",
      parentsAlive: "yes",
      motherDeathAge: "",
      fatherDeathAge: "",
      fatherOccupation: "",
      fatherIncome: "",
      motherOccupation: "",
      motherIncome: "",
      ageYears: "",
      ageMonths: "",
      height: "",
      weight: "",
      presentOccupation: "",
      personalIncome: "",
      nccTraining: "no",
      nccDetails: "",
      gamesAndSports: "",
      hobbies: "",
      extraCurricularActivities: "",
      positionsOfResponsibility: "",
      commissionNature: "",
      serviceChoice: "army",
      previousAttempts: "",
      previousSSBDetails: "",
    },
  });

  // Load existing PIQ data
  useEffect(() => {
    if (user) {
      loadPIQData();
    }
  }, [user]);

  const loadPIQData = async () => {
    try {
      const { data, error } = await supabase
        .from('piq_forms')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        // Transform database data to form data
        const formData = {
          selectionBoard: data.selection_board || '',
          batchNo: data.batch_no || '',
          chestNo: data.chest_no || '',
          rollNo: data.roll_no || '',
          fullName: data.full_name || '',
          fatherName: data.father_name || '',
          maxResidencePlace: data.max_residence_place || '',
          maxResidenceDistrict: data.max_residence_district || '',
          maxResidenceState: data.max_residence_state || '',
          maxResidencePopulation: data.max_residence_population || '',
          presentResidencePlace: data.present_residence_place || '',
          presentResidenceDistrict: data.present_residence_district || '',
          presentResidenceState: data.present_residence_state || '',
          presentResidencePopulation: data.present_residence_population || '',
          permanentResidencePlace: data.permanent_residence_place || '',
          permanentResidenceDistrict: data.permanent_residence_district || '',
          permanentResidenceState: data.permanent_residence_state || '',
          permanentResidencePopulation: data.permanent_residence_population || '',
          isDistrictHQ: data.is_district_hq || 'no',
          parentsAlive: data.parents_alive || 'yes',
          motherDeathAge: data.mother_death_age || '',
          fatherDeathAge: data.father_death_age || '',
          fatherOccupation: data.father_occupation || '',
          fatherIncome: data.father_income || '',
          motherOccupation: data.mother_occupation || '',
          motherIncome: data.mother_income || '',
          ageYears: data.age_years || '',
          ageMonths: data.age_months || '',
          height: data.height || '',
          weight: data.weight || '',
          presentOccupation: data.present_occupation || '',
          personalIncome: data.personal_income || '',
          nccTraining: data.ncc_training || 'no',
          nccDetails: data.ncc_details || '',
          gamesAndSports: data.games_and_sports || '',
          hobbies: data.hobbies || '',
          extraCurricularActivities: data.extra_curricular_activities || '',
          positionsOfResponsibility: data.positions_of_responsibility || '',
          commissionNature: data.commission_nature || '',
          serviceChoice: data.service_choice || 'army',
          previousAttempts: data.previous_attempts || '',
          previousSSBDetails: data.previous_ssb_details || '',
        };
        
        form.reset(formData);
      }
    } catch (error) {
      console.error('Error loading PIQ data:', error);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

const sections = [
  {
    title: "Personal Information",
    icon: User,
    description: "Basic personal and contact details"
  },
  {
    title: "Family Background",
    icon: Shield,
    description: "Family details and background information"
  },
  {
    title: "Education & Physical",
    icon: GraduationCap,
    description: "Educational qualifications and physical details"
  },
  {
    title: "Activities & Preferences",
    icon: Trophy,
    description: "Extra-curricular activities and commission preferences"
  }
];

// Map field keys to friendly labels for better error messages
const fieldLabels: Record<keyof PIQFormData, string> = {
  selectionBoard: 'Selection Board',
  batchNo: 'Batch No',
  chestNo: 'Chest No',
  rollNo: 'Roll No',
  fullName: 'Full Name',
  fatherName: "Father's Name",
  maxResidencePlace: 'Place of Maximum Residence - Place',
  maxResidenceDistrict: 'Place of Maximum Residence - District',
  maxResidenceState: 'Place of Maximum Residence - State',
  maxResidencePopulation: 'Place of Maximum Residence - Population',
  presentResidencePlace: 'Present Residence - Place',
  presentResidenceDistrict: 'Present Residence - District',
  presentResidenceState: 'Present Residence - State',
  presentResidencePopulation: 'Present Residence - Population',
  permanentResidencePlace: 'Permanent Residence - Place',
  permanentResidenceDistrict: 'Permanent Residence - District',
  permanentResidenceState: 'Permanent Residence - State',
  permanentResidencePopulation: 'Permanent Residence - Population',
  isDistrictHQ: 'Is District HQ',
  parentsAlive: 'Parents Alive',
  motherDeathAge: "Mother's Death Age",
  fatherDeathAge: "Father's Death Age",
  fatherOccupation: "Father's Occupation",
  fatherIncome: "Father's Income",
  motherOccupation: "Mother's Occupation",
  motherIncome: "Mother's Income",
  ageYears: 'Age (Years)',
  ageMonths: 'Age (Months)',
  height: 'Height',
  weight: 'Weight',
  presentOccupation: 'Present Occupation',
  personalIncome: 'Personal Income',
  nccTraining: 'NCC Training',
  nccDetails: 'NCC Details',
  gamesAndSports: 'Games & Sports',
  hobbies: 'Hobbies',
  extraCurricularActivities: 'Extra-curricular Activities',
  positionsOfResponsibility: 'Positions of Responsibility',
  commissionNature: 'Nature of Commission',
  serviceChoice: 'Choice of Service',
  previousAttempts: 'Previous Attempts',
  previousSSBDetails: 'Previous SSB Details',
};

  const onSubmit = async (data: PIQFormData) => {
    console.log('PIQ Form submission started', { isEdit, data });
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit the PIQ form.",
        variant: "destructive",
      });
      return;
    }

    // Validate form before submission
    const result = await form.trigger();
    if (!result) {
      console.log('Form validation failed');
      const errors = form.formState.errors;
      console.log('Validation errors:', errors);
      
      // Find first error and scroll to it
      const errorFields = Object.keys(errors);
      if (errorFields.length > 0) {
        const firstError = errorFields[0];
        console.log('First error field:', firstError);
        
        // Show validation error toast
        const key = firstError as keyof PIQFormData;
        const label = fieldLabels[key] || key;
        const message = (errors as any)[key]?.message || 'Please complete this field.';
        toast({
          title: "Form Validation Failed",
          description: `${label}: ${message}`,
          variant: "destructive",
        });
        
        // Scroll to first error field
        const errorElement = document.querySelector(`[name="${firstError}"]`);
        if (errorElement) {
          errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    setLoading(true);
    try {
      const piqData = {
        user_id: user.id,
        selection_board: data.selectionBoard,
        batch_no: data.batchNo,
        chest_no: data.chestNo,
        roll_no: data.rollNo,
        full_name: data.fullName,
        father_name: data.fatherName,
        max_residence_place: data.maxResidencePlace,
        max_residence_district: data.maxResidenceDistrict,
        max_residence_state: data.maxResidenceState,
        max_residence_population: data.maxResidencePopulation,
        present_residence_place: data.presentResidencePlace,
        present_residence_district: data.presentResidenceDistrict,
        present_residence_state: data.presentResidenceState,
        present_residence_population: data.presentResidencePopulation,
        permanent_residence_place: data.permanentResidencePlace,
        permanent_residence_district: data.permanentResidenceDistrict,
        permanent_residence_state: data.permanentResidenceState,
        permanent_residence_population: data.permanentResidencePopulation,
        is_district_hq: data.isDistrictHQ,
        parents_alive: data.parentsAlive,
        mother_death_age: data.motherDeathAge,
        father_death_age: data.fatherDeathAge,
        father_occupation: data.fatherOccupation,
        father_income: data.fatherIncome,
        mother_occupation: data.motherOccupation,
        mother_income: data.motherIncome,
        age_years: data.ageYears,
        age_months: data.ageMonths,
        height: data.height,
        weight: data.weight,
        present_occupation: data.presentOccupation,
        personal_income: data.personalIncome,
        ncc_training: data.nccTraining,
        ncc_details: data.nccDetails,
        games_and_sports: data.gamesAndSports,
        hobbies: data.hobbies,
        extra_curricular_activities: data.extraCurricularActivities,
        positions_of_responsibility: data.positionsOfResponsibility,
        commission_nature: data.commissionNature,
        service_choice: data.serviceChoice,
        previous_attempts: data.previousAttempts,
        previous_ssb_details: data.previousSSBDetails,
      };

// Manual upsert: update if exists, otherwise insert
const { data: existing } = await supabase
  .from('piq_forms')
  .select('id')
  .eq('user_id', user.id)
  .limit(1)
  .maybeSingle();

if (existing) {
  const { error: updateError } = await supabase
    .from('piq_forms')
    .update(piqData)
    .eq('id', existing.id);
  if (updateError) throw updateError;
} else {
  const { error: insertError } = await supabase
    .from('piq_forms')
    .insert(piqData);
  if (insertError) throw insertError;
}


      console.log('PIQ form submitted successfully');
      toast({
        title: "Success",
        description: isEdit ? "PIQ form updated successfully!" : "PIQ form submitted successfully!",
      });
      
      // Call completion callback
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('PIQ form submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit PIQ form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    try {
      const currentData = form.getValues();
      if (!user) return;

      // Build a partial payload without enforcing full validation
      const piqData = {
        user_id: user.id,
        selection_board: currentData.selectionBoard || null,
        batch_no: currentData.batchNo || null,
        chest_no: currentData.chestNo || null,
        roll_no: currentData.rollNo || null,
        full_name: currentData.fullName || null,
        father_name: currentData.fatherName || null,
        max_residence_place: currentData.maxResidencePlace || null,
        max_residence_district: currentData.maxResidenceDistrict || null,
        max_residence_state: currentData.maxResidenceState || null,
        max_residence_population: currentData.maxResidencePopulation || null,
        present_residence_place: currentData.presentResidencePlace || null,
        present_residence_district: currentData.presentResidenceDistrict || null,
        present_residence_state: currentData.presentResidenceState || null,
        present_residence_population: currentData.presentResidencePopulation || null,
        permanent_residence_place: currentData.permanentResidencePlace || null,
        permanent_residence_district: currentData.permanentResidenceDistrict || null,
        permanent_residence_state: currentData.permanentResidenceState || null,
        permanent_residence_population: currentData.permanentResidencePopulation || null,
        is_district_hq: currentData.isDistrictHQ || null,
        parents_alive: currentData.parentsAlive || null,
        mother_death_age: currentData.motherDeathAge || null,
        father_death_age: currentData.fatherDeathAge || null,
        father_occupation: currentData.fatherOccupation || null,
        father_income: currentData.fatherIncome || null,
        mother_occupation: currentData.motherOccupation || null,
        mother_income: currentData.motherIncome || null,
        age_years: currentData.ageYears || null,
        age_months: currentData.ageMonths || null,
        height: currentData.height || null,
        weight: currentData.weight || null,
        present_occupation: currentData.presentOccupation || null,
        personal_income: currentData.personalIncome || null,
        ncc_training: currentData.nccTraining || null,
        ncc_details: currentData.nccDetails || null,
        games_and_sports: currentData.gamesAndSports || null,
        hobbies: currentData.hobbies || null,
        extra_curricular_activities: currentData.extraCurricularActivities || null,
        positions_of_responsibility: currentData.positionsOfResponsibility || null,
        commission_nature: currentData.commissionNature || null,
        service_choice: currentData.serviceChoice || null,
        previous_attempts: currentData.previousAttempts || null,
        previous_ssb_details: currentData.previousSSBDetails || null,
      };

// Manual upsert: update if exists, otherwise insert
const { data: existing } = await supabase
  .from('piq_forms')
  .select('id')
  .eq('user_id', user.id)
  .limit(1)
  .maybeSingle();

if (existing) {
  const { error: updateError } = await supabase
    .from('piq_forms')
    .update(piqData)
    .eq('id', existing.id);
  if (updateError) throw updateError;
} else {
  const { error: insertError } = await supabase
    .from('piq_forms')
    .insert(piqData);
  if (insertError) throw insertError;
}

      

      toast({ title: 'Progress Saved', description: 'Your PIQ progress has been saved.' });
    } catch (e: any) {
      console.error('Save progress error:', e);
      toast({ title: 'Error', description: e.message || 'Failed to save progress.', variant: 'destructive' });
    }
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="selectionBoard"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Selection Board (No. & Place)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 1 SSB Bhopal" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="batchNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Batch No.</FormLabel>
              <FormControl>
                <Input placeholder="Enter batch number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="chestNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chest No.</FormLabel>
              <FormControl>
                <Input placeholder="Enter chest number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rollNo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>UPSC / Other Roll No.</FormLabel>
              <FormControl>
                <Input placeholder="Enter roll number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <Separator />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name (As in Matric Certificate)</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fatherName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Father's Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter father's name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Place of Maximum Residence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="maxResidencePlace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place</FormLabel>
                <FormControl>
                  <Input placeholder="City/Town" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxResidenceDistrict"
            render={({ field }) => (
              <FormItem>
                <FormLabel>District</FormLabel>
                <FormControl>
                  <Input placeholder="District" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxResidenceState"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxResidencePopulation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Population</FormLabel>
                <FormControl>
                  <Input placeholder="Population" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Present Residence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="presentResidencePlace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place</FormLabel>
                <FormControl>
                  <Input placeholder="City/Town" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="presentResidenceDistrict"
            render={({ field }) => (
              <FormItem>
                <FormLabel>District</FormLabel>
                <FormControl>
                  <Input placeholder="District" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="presentResidenceState"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="presentResidencePopulation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Population</FormLabel>
                <FormControl>
                  <Input placeholder="Population" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="font-semibold text-foreground">Permanent Residence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="permanentResidencePlace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place</FormLabel>
                <FormControl>
                  <Input placeholder="City/Town" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="permanentResidenceDistrict"
            render={({ field }) => (
              <FormItem>
                <FormLabel>District</FormLabel>
                <FormControl>
                  <Input placeholder="District" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="permanentResidenceState"
            render={({ field }) => (
              <FormItem>
                <FormLabel>State</FormLabel>
                <FormControl>
                  <Input placeholder="State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="permanentResidencePopulation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Population</FormLabel>
                <FormControl>
                  <Input placeholder="Population" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <FormField
        control={form.control}
        name="isDistrictHQ"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Is permanent residence a District HQ?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-row space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="hq-yes" />
                  <Label htmlFor="hq-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="hq-no" />
                  <Label htmlFor="hq-no">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderFamilyBackground = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="parentsAlive"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are parents alive?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-row space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="parents-yes" />
                  <Label htmlFor="parents-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="parents-no" />
                  <Label htmlFor="parents-no">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fatherOccupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Father's Occupation</FormLabel>
              <FormControl>
                <Input placeholder="Enter occupation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="fatherIncome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Father's Monthly Income</FormLabel>
              <FormControl>
                <Input placeholder="Enter monthly income" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="motherOccupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mother's Occupation</FormLabel>
              <FormControl>
                <Input placeholder="Enter occupation" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="motherIncome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mother's Monthly Income</FormLabel>
              <FormControl>
                <Input placeholder="Enter monthly income" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderEducationPhysical = () => (
    <div className="space-y-6">
      <h4 className="font-semibold text-foreground">Physical Details</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FormField
          control={form.control}
          name="ageYears"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age (Years)</FormLabel>
              <FormControl>
                <Input placeholder="Years" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="ageMonths"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Age (Months)</FormLabel>
              <FormControl>
                <Input placeholder="Months" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="height"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Height (cm)</FormLabel>
              <FormControl>
                <Input placeholder="Height in cm" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="weight"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Weight (kg)</FormLabel>
              <FormControl>
                <Input placeholder="Weight in kg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Separator />

      <h4 className="font-semibold text-foreground">Current Status</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="presentOccupation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Present Occupation</FormLabel>
              <FormControl>
                <Input placeholder="Current occupation/status" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="personalIncome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Monthly Income</FormLabel>
              <FormControl>
                <Input placeholder="Monthly income" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="nccTraining"
        render={({ field }) => (
          <FormItem>
            <FormLabel>NCC Training</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-row space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="ncc-yes" />
                  <Label htmlFor="ncc-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="ncc-no" />
                  <Label htmlFor="ncc-no">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch("nccTraining") === "yes" && (
        <FormField
          control={form.control}
          name="nccDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>NCC Details</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Provide details about duration, certificates, and other relevant information"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );

  const renderActivitiesPreferences = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="gamesAndSports"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Games & Sports Participated In</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="List games and sports you have participated in"
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="hobbies"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Hobbies / Interests</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Describe your hobbies and interests"
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="extraCurricularActivities"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Extra-Curricular Activities</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="List your extra-curricular activities"
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="positionsOfResponsibility"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Positions of Responsibility</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Mention any positions of responsibility held in NCC/Scouting/Sports/etc."
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      <h4 className="font-semibold text-foreground">Commission Preferences</h4>
      
      <FormField
        control={form.control}
        name="commissionNature"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nature of Commission Desired</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Permanent Commission, Short Service Commission" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="serviceChoice"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Choice of Service</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="army">Indian Army</SelectItem>
                <SelectItem value="navy">Indian Navy</SelectItem>
                <SelectItem value="airforce">Indian Air Force</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="previousAttempts"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Number of Attempts for Commission So Far</FormLabel>
            <FormControl>
              <Input placeholder="Enter number of attempts" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="previousSSBDetails"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Details of Previous SSB Interviews (if any)</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Service, Entry type, Place, Date"
                className="min-h-[80px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0: return renderPersonalInfo();
      case 1: return renderFamilyBackground();
      case 2: return renderEducationPhysical();
      case 3: return renderActivitiesPreferences();
      default: return renderPersonalInfo();
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Personal Information Questionnaire</h1>
        <p className="text-muted-foreground">Complete your PIQ form for SSB psychological assessment</p>
      </div>

      {/* Section Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {sections.map((section, index) => {
          const Icon = section.icon;
          const isActive = currentSection === index;
          const isCompleted = false; // Add completion logic later
          
          return (
            <Card 
              key={index}
              className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                isActive ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => setCurrentSection(index)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{section.title}</h3>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = sections[currentSection].icon;
                  return <Icon className="w-5 h-5" />;
                })()}
                {sections[currentSection].title}
              </CardTitle>
              <CardDescription>
                {sections[currentSection].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderCurrentSection()}
            </CardContent>
          </Card>

          {/* Navigation and Action Buttons */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
                disabled={currentSection === sections.length - 1}
              >
                Next
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={saveProgress}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Progress
              </Button>
              <Button 
                type="submit" 
                disabled={loading} 
                className="flex items-center gap-2"
                onClick={() => console.log('Submit button clicked', { currentSection, loading })}
              >
                <FileText className="w-4 h-4" />
                {loading ? "Processing..." : (isEdit ? "Update PIQ" : "Complete PIQ")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PIQForm;