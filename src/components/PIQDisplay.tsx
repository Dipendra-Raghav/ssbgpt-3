import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Shield, GraduationCap, Trophy, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PIQData {
  selection_board: string;
  batch_no: string;
  chest_no: string;
  roll_no: string;
  full_name: string;
  father_name: string;
  max_residence_place: string;
  max_residence_district: string;
  max_residence_state: string;
  max_residence_population: string;
  present_residence_place: string;
  present_residence_district: string;
  present_residence_state: string;
  present_residence_population: string;
  permanent_residence_place: string;
  permanent_residence_district: string;
  permanent_residence_state: string;
  permanent_residence_population: string;
  is_district_hq: string;
  parents_alive: string;
  mother_death_age?: string;
  father_death_age?: string;
  father_occupation: string;
  father_income: string;
  mother_occupation: string;
  mother_income: string;
  age_years: string;
  age_months: string;
  height: string;
  weight: string;
  present_occupation: string;
  personal_income: string;
  ncc_training: string;
  ncc_details?: string;
  games_and_sports: string;
  hobbies: string;
  extra_curricular_activities: string;
  positions_of_responsibility: string;
  commission_nature: string;
  service_choice: string;
  previous_attempts: string;
  previous_ssb_details?: string;
  created_at?: string;
  updated_at?: string;
}

interface PIQDisplayProps {
  data: PIQData;
  onEdit: () => void;
}

const DisplayField = ({ label, value }: { label: string; value: string | undefined }) => (
  <div className="space-y-1">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <p className="text-sm">{value || 'Not provided'}</p>
  </div>
);

const PIQDisplay = ({ data, onEdit }: PIQDisplayProps) => {
  const sections = [
    {
      title: "Personal Information",
      icon: User,
      fields: [
        { label: "Selection Board", value: data.selection_board },
        { label: "Batch No", value: data.batch_no },
        { label: "Chest No", value: data.chest_no },
        { label: "Roll No", value: data.roll_no },
        { label: "Full Name", value: data.full_name },
        { label: "Father's Name", value: data.father_name },
      ]
    },
    {
      title: "Residence Information",
      icon: User,
      fields: [
        { label: "Max Residence Place", value: data.max_residence_place },
        { label: "Max Residence District", value: data.max_residence_district },
        { label: "Max Residence State", value: data.max_residence_state },
        { label: "Max Residence Population", value: data.max_residence_population },
        { label: "Present Residence Place", value: data.present_residence_place },
        { label: "Present Residence District", value: data.present_residence_district },
        { label: "Present Residence State", value: data.present_residence_state },
        { label: "Present Residence Population", value: data.present_residence_population },
        { label: "Permanent Residence Place", value: data.permanent_residence_place },
        { label: "Permanent Residence District", value: data.permanent_residence_district },
        { label: "Permanent Residence State", value: data.permanent_residence_state },
        { label: "Permanent Residence Population", value: data.permanent_residence_population },
        { label: "Is District HQ", value: data.is_district_hq === 'yes' ? 'Yes' : 'No' },
      ]
    },
    {
      title: "Family Background",
      icon: Shield,
      fields: [
        { label: "Parents Alive", value: data.parents_alive === 'yes' ? 'Yes' : 'No' },
        { label: "Mother's Death Age", value: data.mother_death_age },
        { label: "Father's Death Age", value: data.father_death_age },
        { label: "Father's Occupation", value: data.father_occupation },
        { label: "Father's Income", value: data.father_income },
        { label: "Mother's Occupation", value: data.mother_occupation },
        { label: "Mother's Income", value: data.mother_income },
      ]
    },
    {
      title: "Physical Details",
      icon: GraduationCap,
      fields: [
        { label: "Age (Years)", value: data.age_years },
        { label: "Age (Months)", value: data.age_months },
        { label: "Height", value: data.height },
        { label: "Weight", value: data.weight },
      ]
    },
    {
      title: "Current Status",
      icon: GraduationCap,
      fields: [
        { label: "Present Occupation", value: data.present_occupation },
        { label: "Personal Income", value: data.personal_income },
        { label: "NCC Training", value: data.ncc_training === 'yes' ? 'Yes' : 'No' },
        { label: "NCC Details", value: data.ncc_details },
      ]
    },
    {
      title: "Activities & Preferences",
      icon: Trophy,
      fields: [
        { label: "Games & Sports", value: data.games_and_sports },
        { label: "Hobbies", value: data.hobbies },
        { label: "Extra-curricular Activities", value: data.extra_curricular_activities },
        { label: "Positions of Responsibility", value: data.positions_of_responsibility },
        { label: "Commission Nature", value: data.commission_nature },
        { label: "Service Choice", value: data.service_choice?.toUpperCase() },
        { label: "Previous Attempts", value: data.previous_attempts },
        { label: "Previous SSB Details", value: data.previous_ssb_details },
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information Questionnaire
              </CardTitle>
              <CardDescription>
                Your completed PIQ form details
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-1">
                Completed
              </Badge>
              <Button onClick={onEdit} className="flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Edit PIQ
              </Button>
            </div>
          </div>
          {data.updated_at && (
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(data.updated_at).toLocaleDateString()}
            </p>
          )}
        </CardHeader>
      </Card>

      {/* Sections */}
      <div className="grid gap-6">
        {sections.map((section, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <section.icon className="w-5 h-5" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.fields.map((field, fieldIndex) => (
                  <DisplayField
                    key={fieldIndex}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PIQDisplay;