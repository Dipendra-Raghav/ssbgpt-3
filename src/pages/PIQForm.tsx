import React, { useState, useEffect } from "react";
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
import { Save, FileText, User, GraduationCap, Trophy, Shield, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabaseClient as supabase } from "@/lib/supabase-client";
import { Navigate } from "react-router-dom";

const piqSchema = z.object({
  // Personal Information (removed selection board, batch no, chest no, roll no as requested)
  fullName: z.string().trim().min(1, "Full Name is required"),
  fatherName: z.string().trim().min(1, "Father's Name is required"),
  dateOfBirth: z.string().trim().min(1, "Date of Birth is required"),
  religion: z.string().trim().min(1, "Religion is required"),
  casteCategory: z.string().trim().min(1, "Caste Category is required"),
  motherTongue: z.string().trim().min(1, "Mother Tongue is required"),
  maritalStatus: z.enum(["married", "single", "widower"]),
  stateAndDistrict: z.string().trim().min(1, "State & District is required"),
  
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
  
  fatherEducation: z.string().trim().min(1, "Father's education is required"),
  fatherOccupation: z.string().trim().min(1, "Father's occupation is required"),
  fatherIncome: z.string().trim().min(1, "Father's income is required"),
  
  motherEducation: z.string().trim().min(1, "Mother's education is required"),
  motherOccupation: z.string().trim().min(1, "Mother's occupation is required"),
  motherIncome: z.string().trim().min(1, "Mother's income is required"),
  
  guardianName: z.string().trim().optional(),
  guardianEducation: z.string().trim().optional(),
  guardianOccupation: z.string().trim().optional(),
  guardianIncome: z.string().trim().optional(),
  
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
  const [siblings, setSiblings] = useState<any[]>([]);
  const [educationRecords, setEducationRecords] = useState<any[]>([]);
  
  const form = useForm<PIQFormData>({
    resolver: zodResolver(piqSchema),
    defaultValues: {
      fullName: "",
      fatherName: "",
      dateOfBirth: "",
      religion: "",
      casteCategory: "",
      motherTongue: "",
      maritalStatus: "single",
      stateAndDistrict: "",
      
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
      
      fatherEducation: "",
      fatherOccupation: "",
      fatherIncome: "",
      motherEducation: "",
      motherOccupation: "",
      motherIncome: "",
      guardianName: "",
      guardianEducation: "",
      guardianOccupation: "",
      guardianIncome: "",
      
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

  useEffect(() => {
    if (user && isEdit) {
      loadPIQData();
    }
  }, [user, isEdit]);

  const loadPIQData = async () => {
    try {
      const { data, error } = await supabase
        .from('piq_forms')
        .select('*')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        // Convert database fields to form fields
        const formData = {
          fullName: data.full_name || "",
          fatherName: data.father_name || "",
          dateOfBirth: data.date_of_birth || "",
          religion: data.religion || "",
          casteCategory: data.caste_category || "",
          motherTongue: data.mother_tongue || "",
          maritalStatus: data.marital_status || "single",
          stateAndDistrict: data.state_and_district || "",
          
          maxResidencePlace: data.max_residence_place || "",
          maxResidenceDistrict: data.max_residence_district || "",
          maxResidenceState: data.max_residence_state || "",
          maxResidencePopulation: data.max_residence_population || "",
          
          presentResidencePlace: data.present_residence_place || "",
          presentResidenceDistrict: data.present_residence_district || "",
          presentResidenceState: data.present_residence_state || "",
          presentResidencePopulation: data.present_residence_population || "",
          
          permanentResidencePlace: data.permanent_residence_place || "",
          permanentResidenceDistrict: data.permanent_residence_district || "",
          permanentResidenceState: data.permanent_residence_state || "",
          permanentResidencePopulation: data.permanent_residence_population || "",
          
          isDistrictHQ: data.is_district_hq || "no",
          
          parentsAlive: data.parents_alive || "yes",
          motherDeathAge: data.mother_death_age || "",
          fatherDeathAge: data.father_death_age || "",
          
          fatherEducation: data.father_education || "",
          fatherOccupation: data.father_occupation || "",
          fatherIncome: data.father_income || "",
          motherEducation: data.mother_education || "",
          motherOccupation: data.mother_occupation || "",
          motherIncome: data.mother_income || "",
          guardianName: data.guardian_name || "",
          guardianEducation: data.guardian_education || "",
          guardianOccupation: data.guardian_occupation || "",
          guardianIncome: data.guardian_income || "",
          
          ageYears: data.age_years || "",
          ageMonths: data.age_months || "",
          height: data.height || "",
          weight: data.weight || "",
          
          presentOccupation: data.present_occupation || "",
          personalIncome: data.personal_income || "",
          nccTraining: data.ncc_training || "no",
          nccDetails: data.ncc_details || "",
          
          gamesAndSports: data.games_and_sports || "",
          hobbies: data.hobbies || "",
          extraCurricularActivities: data.extra_curricular_activities || "",
          positionsOfResponsibility: data.positions_of_responsibility || "",
          
          commissionNature: data.commission_nature || "",
          serviceChoice: data.service_choice || "army",
          previousAttempts: data.previous_attempts || "",
          previousSSBDetails: data.previous_ssb_details || "",
        };

        form.reset(formData as PIQFormData);
        setSiblings(data.siblings_details || []);
        setEducationRecords(data.educational_record || []);
      }
    } catch (error) {
      console.error('Error loading PIQ data:', error);
      toast({
        title: "Error",
        description: "Failed to load PIQ data",
        variant: "destructive",
      });
    }
  };

  const onSubmit = async (data: PIQFormData) => {
    if (!user) return;

    setLoading(true);

    try {
      // Convert form data to database format
      const dbData = {
        user_id: user.id,
        full_name: data.fullName,
        father_name: data.fatherName,
        date_of_birth: data.dateOfBirth,
        religion: data.religion,
        caste_category: data.casteCategory,
        mother_tongue: data.motherTongue,
        marital_status: data.maritalStatus,
        state_and_district: data.stateAndDistrict,
        
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
        
        father_education: data.fatherEducation,
        father_occupation: data.fatherOccupation,
        father_income: data.fatherIncome,
        mother_education: data.motherEducation,
        mother_occupation: data.motherOccupation,
        mother_income: data.motherIncome,
        guardian_name: data.guardianName,
        guardian_education: data.guardianEducation,
        guardian_occupation: data.guardianOccupation,
        guardian_income: data.guardianIncome,
        
        siblings_details: siblings,
        educational_record: educationRecords,
        
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

      const { error } = await supabase
        .from('piq_forms')
        .upsert(dbData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `PIQ form ${isEdit ? 'updated' : 'submitted'} successfully!`,
      });

      onComplete?.();
    } catch (error) {
      console.error('Error saving PIQ form:', error);
      toast({
        title: "Error",
        description: "Failed to save PIQ form. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProgress = async () => {
    if (!user) return;

    const formData = form.getValues();
    // Same logic as onSubmit but without validation
    try {
      const dbData = {
        user_id: user.id,
        full_name: formData.fullName,
        father_name: formData.fatherName,
        date_of_birth: formData.dateOfBirth,
        religion: formData.religion,
        caste_category: formData.casteCategory,
        mother_tongue: formData.motherTongue,
        marital_status: formData.maritalStatus,
        state_and_district: formData.stateAndDistrict,
        
        max_residence_place: formData.maxResidencePlace,
        max_residence_district: formData.maxResidenceDistrict,
        max_residence_state: formData.maxResidenceState,
        max_residence_population: formData.maxResidencePopulation,
        
        present_residence_place: formData.presentResidencePlace,
        present_residence_district: formData.presentResidenceDistrict,
        present_residence_state: formData.presentResidenceState,
        present_residence_population: formData.presentResidencePopulation,
        
        permanent_residence_place: formData.permanentResidencePlace,
        permanent_residence_district: formData.permanentResidenceDistrict,
        permanent_residence_state: formData.permanentResidenceState,
        permanent_residence_population: formData.permanentResidencePopulation,
        
        is_district_hq: formData.isDistrictHQ,
        parents_alive: formData.parentsAlive,
        mother_death_age: formData.motherDeathAge,
        father_death_age: formData.fatherDeathAge,
        
        father_education: formData.fatherEducation,
        father_occupation: formData.fatherOccupation,
        father_income: formData.fatherIncome,
        mother_education: formData.motherEducation,
        mother_occupation: formData.motherOccupation,
        mother_income: formData.motherIncome,
        guardian_name: formData.guardianName,
        guardian_education: formData.guardianEducation,
        guardian_occupation: formData.guardianOccupation,
        guardian_income: formData.guardianIncome,
        
        siblings_details: siblings,
        educational_record: educationRecords,
        
        age_years: formData.ageYears,
        age_months: formData.ageMonths,
        height: formData.height,
        weight: formData.weight,
        
        present_occupation: formData.presentOccupation,
        personal_income: formData.personalIncome,
        ncc_training: formData.nccTraining,
        ncc_details: formData.nccDetails,
        
        games_and_sports: formData.gamesAndSports,
        hobbies: formData.hobbies,
        extra_curricular_activities: formData.extraCurricularActivities,
        positions_of_responsibility: formData.positionsOfResponsibility,
        
        commission_nature: formData.commissionNature,
        service_choice: formData.serviceChoice,
        previous_attempts: formData.previousAttempts,
        previous_ssb_details: formData.previousSSBDetails,
      };

      const { error } = await supabase
        .from('piq_forms')
        .upsert(dbData, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast({
        title: "Progress Saved",
        description: "Your progress has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving progress:', error);
      toast({
        title: "Error",
        description: "Failed to save progress.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const sections = [
    {
      title: "Personal Information",
      icon: User,
      description: "Basic personal details and identification information"
    },
    {
      title: "Residence Information", 
      icon: Shield,
      description: "Details about your residential addresses"
    },
    {
      title: "Family Background",
      icon: User,
      description: "Information about family members and their occupations"
    },
    {
      title: "Education & Physical Details",
      icon: GraduationCap,
      description: "Educational qualifications and physical measurements"
    },
    {
      title: "Activities & Preferences",
      icon: Trophy,
      description: "Sports, hobbies, and service preferences"
    }
  ];

  const addSibling = () => {
    setSiblings([...siblings, {
      relationship: '',
      education: '',
      occupation: '',
      income: ''
    }]);
  };

  const removeSibling = (index: number) => {
    setSiblings(siblings.filter((_, i) => i !== index));
  };

  const updateSibling = (index: number, field: string, value: string) => {
    const updatedSiblings = [...siblings];
    updatedSiblings[index] = { ...updatedSiblings[index], [field]: value };
    setSiblings(updatedSiblings);
  };

  const addEducationRecord = () => {
    setEducationRecords([...educationRecords, {
      qualification: '',
      institution: '',
      board: '',
      year: '',
      percentage: '',
      medium: '',
      boarder: '',
      achievements: ''
    }]);
  };

  const removeEducationRecord = (index: number) => {
    setEducationRecords(educationRecords.filter((_, i) => i !== index));
  };

  const updateEducationRecord = (index: number, field: string, value: string) => {
    const updatedRecords = [...educationRecords];
    updatedRecords[index] = { ...updatedRecords[index], [field]: value };
    setEducationRecords(updatedRecords);
  };

  const renderPersonalInfo = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="As in matriculation certificate" {...field} />
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
              <FormLabel>Father's Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter father's name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="religion"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Religion *</FormLabel>
              <FormControl>
                <Input placeholder="Enter religion" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="motherTongue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mother Tongue *</FormLabel>
              <FormControl>
                <Input placeholder="Enter mother tongue" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="casteCategory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Caste Category *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="sc">SC</SelectItem>
                  <SelectItem value="st">ST</SelectItem>
                  <SelectItem value="obc">OBC</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="maritalStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marital Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="widower">Widower</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="stateAndDistrict"
          render={({ field }) => (
            <FormItem>
              <FormLabel>State & District *</FormLabel>
              <FormControl>
                <Input placeholder="Enter state & district" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderResidenceInfo = () => (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-4">Maximum Residence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="maxResidencePlace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter place" {...field} />
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
                <FormLabel>District *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter district" {...field} />
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
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter state" {...field} />
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
                <FormLabel>Population *</FormLabel>
                <FormControl>
                  <Input placeholder="Approximate population" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Present Residence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="presentResidencePlace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter place" {...field} />
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
                <FormLabel>District *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter district" {...field} />
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
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter state" {...field} />
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
                <FormLabel>Population *</FormLabel>
                <FormControl>
                  <Input placeholder="Approximate population" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Permanent Residence</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="permanentResidencePlace"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter place" {...field} />
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
                <FormLabel>District *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter district" {...field} />
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
                <FormLabel>State *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter state" {...field} />
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
                <FormLabel>Population *</FormLabel>
                <FormControl>
                  <Input placeholder="Approximate population" {...field} />
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
          <FormItem className="space-y-3">
            <FormLabel>Is District HQ?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-row space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="district-hq-yes" />
                  <Label htmlFor="district-hq-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="district-hq-no" />
                  <Label htmlFor="district-hq-no">No</Label>
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
          <FormItem className="space-y-3">
            <FormLabel>Are parents alive?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-row space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="parents-alive-yes" />
                  <Label htmlFor="parents-alive-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="parents-alive-no" />
                  <Label htmlFor="parents-alive-no">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch("parentsAlive") === "no" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="motherDeathAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your age at mother's death</FormLabel>
                <FormControl>
                  <Input placeholder="Age in years" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fatherDeathAge"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your age at father's death</FormLabel>
                <FormControl>
                  <Input placeholder="Age in years" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      <div>
        <h4 className="font-medium mb-4">Father's Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="fatherEducation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Education *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter education" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="fatherOccupation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Occupation *</FormLabel>
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
                <FormLabel>Monthly Income *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter monthly income" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-4">Mother's Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="motherEducation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Education *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter education" {...field} />
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
                <FormLabel>Occupation *</FormLabel>
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
                <FormLabel>Monthly Income *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter monthly income" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-4">Guardian's Details (if applicable)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="guardianName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Guardian's Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter guardian's name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="guardianEducation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Education</FormLabel>
                <FormControl>
                  <Input placeholder="Enter education" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="guardianOccupation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Occupation</FormLabel>
                <FormControl>
                  <Input placeholder="Enter occupation" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="guardianIncome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Income</FormLabel>
                <FormControl>
                  <Input placeholder="Enter monthly income" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Siblings Details</h4>
          <Button type="button" onClick={addSibling} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Sibling
          </Button>
        </div>
        
        {siblings.map((sibling, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium">Sibling {index + 1}</h5>
              <Button 
                type="button" 
                onClick={() => removeSibling(index)} 
                size="sm" 
                variant="destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Relationship</Label>
                <Select 
                  value={sibling.relationship} 
                  onValueChange={(value) => updateSibling(index, 'relationship', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elder-brother">Elder Brother</SelectItem>
                    <SelectItem value="elder-sister">Elder Sister</SelectItem>
                    <SelectItem value="younger-brother">Younger Brother</SelectItem>
                    <SelectItem value="younger-sister">Younger Sister</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Education</Label>
                <Input 
                  placeholder="Enter education" 
                  value={sibling.education}
                  onChange={(e) => updateSibling(index, 'education', e.target.value)}
                />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input 
                  placeholder="Enter occupation" 
                  value={sibling.occupation}
                  onChange={(e) => updateSibling(index, 'occupation', e.target.value)}
                />
              </div>
              <div>
                <Label>Monthly Income</Label>
                <Input 
                  placeholder="Enter income" 
                  value={sibling.income}
                  onChange={(e) => updateSibling(index, 'income', e.target.value)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderEducationPhysical = () => (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium">Educational Record (From Matriculation onwards)</h4>
          <Button type="button" onClick={addEducationRecord} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
        
        {educationRecords.map((record, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h5 className="font-medium">Educational Record {index + 1}</h5>
              <Button 
                type="button" 
                onClick={() => removeEducationRecord(index)} 
                size="sm" 
                variant="destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Qualification</Label>
                <Input 
                  placeholder="e.g., Matriculation, 12th, Graduation" 
                  value={record.qualification}
                  onChange={(e) => updateEducationRecord(index, 'qualification', e.target.value)}
                />
              </div>
              <div>
                <Label>Institution Name</Label>
                <Input 
                  placeholder="Full name of institution" 
                  value={record.institution}
                  onChange={(e) => updateEducationRecord(index, 'institution', e.target.value)}
                />
              </div>
              <div>
                <Label>Board/University</Label>
                <Input 
                  placeholder="Board or University" 
                  value={record.board}
                  onChange={(e) => updateEducationRecord(index, 'board', e.target.value)}
                />
              </div>
              <div>
                <Label>Year</Label>
                <Input 
                  placeholder="Year of passing" 
                  value={record.year}
                  onChange={(e) => updateEducationRecord(index, 'year', e.target.value)}
                />
              </div>
              <div>
                <Label>Percentage/Division</Label>
                <Input 
                  placeholder="Percentage or division" 
                  value={record.percentage}
                  onChange={(e) => updateEducationRecord(index, 'percentage', e.target.value)}
                />
              </div>
              <div>
                <Label>Medium of Instruction</Label>
                <Input 
                  placeholder="Language of instruction" 
                  value={record.medium}
                  onChange={(e) => updateEducationRecord(index, 'medium', e.target.value)}
                />
              </div>
              <div>
                <Label>Boarder/Day Scholar</Label>
                <Select 
                  value={record.boarder} 
                  onValueChange={(value) => updateEducationRecord(index, 'boarder', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="boarder">Boarder</SelectItem>
                    <SelectItem value="day-scholar">Day Scholar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Outstanding Achievements</Label>
                <Input 
                  placeholder="Any achievements" 
                  value={record.achievements}
                  onChange={(e) => updateEducationRecord(index, 'achievements', e.target.value)}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Physical Details</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="ageYears"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age (Years) *</FormLabel>
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
                <FormLabel>Age (Months) *</FormLabel>
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
                <FormLabel>Height (in Metres) *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 1.75" {...field} />
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
                <FormLabel>Weight (in Kg) *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 70" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Current Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="presentOccupation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Present Occupation *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter current occupation" {...field} />
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
                <FormLabel>Personal Monthly Income *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter monthly income" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );

  const renderActivitiesPreferences = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="nccTraining"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>N.C.C. Training</FormLabel>
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
              <FormLabel>N.C.C. Training Details</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Provide details about your NCC training (Wing, Division, Certificates obtained)"
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="gamesAndSports"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Participation in Games & Sports *</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Detail your participation in games and sports, period of participation, representation, outstanding achievements"
                className="min-h-[100px]"
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
            <FormLabel>Hobbies/Interests *</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="List your hobbies and interests"
                className="min-h-[100px]"
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
            <FormLabel>Extra-Curricular Activities *</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Detail your participation in extra-curricular activities, duration of participation, outstanding achievements"
                className="min-h-[100px]"
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
            <FormLabel>Positions of Responsibility *</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="List positions of responsibility/offices held in NCC/Scouting/Sports Team/Extra-curricular groups and other fields"
                className="min-h-[100px]"
                {...field} 
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      <div>
        <h4 className="font-medium mb-4">Service Preferences</h4>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="commissionNature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nature of Commission *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter nature of commission" {...field} />
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
                <FormLabel>Choice of Service *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select service" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="army">Army</SelectItem>
                    <SelectItem value="navy">Navy</SelectItem>
                    <SelectItem value="airforce">Air Force</SelectItem>
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
                <FormLabel>Number of chances availed for commission in all three Services *</FormLabel>
                <FormControl>
                  <Input placeholder="Enter number of previous attempts" {...field} />
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
                <FormLabel>Details of all previous interviews</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Details of all previous interviews, if any (Army/Navy/Air Force Selection Boards) - include SSB No. & Place, Chest No., Batch No."
                    className="min-h-[100px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderPersonalInfo();
      case 1:
        return renderResidenceInfo();
      case 2:
        return renderFamilyBackground();
      case 3:
        return renderEducationPhysical();
      case 4:
        return renderActivitiesPreferences();
      default:
        return renderPersonalInfo();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isEdit ? 'Edit PIQ Form' : 'Personal Information Questionnaire'}
          </CardTitle>
          <CardDescription>
            Please fill out all sections carefully. All fields marked with * are required.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Section Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {sections.map((section, index) => (
          <Card 
            key={index} 
            className={`cursor-pointer transition-all ${
              currentSection === index 
                ? 'border-primary bg-primary/5' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => setCurrentSection(index)}
          >
            <CardHeader className="text-center p-4">
              <section.icon className={`w-6 h-6 mx-auto mb-2 ${
                currentSection === index ? 'text-primary' : 'text-muted-foreground'
              }`} />
              <CardTitle className="text-sm">{section.title}</CardTitle>
              <CardDescription className="text-xs">{section.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(sections[currentSection].icon, { className: "w-5 h-5" })}
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

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              disabled={currentSection === 0}
            >
              Previous
            </Button>

            <div className="flex gap-2">
              <Button type="button" onClick={saveProgress} variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Save Progress
              </Button>
              
              {onCancel && (
                <Button type="button" onClick={onCancel} variant="outline">
                  Cancel
                </Button>
              )}
            </div>

            {currentSection < sections.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentSection(Math.min(sections.length - 1, currentSection + 1))}
              >
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEdit ? "Update PIQ" : "Submit PIQ"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};

export default PIQForm;