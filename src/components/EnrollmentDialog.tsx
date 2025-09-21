import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Phone } from "lucide-react";

interface EnrollmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (phoneNumber?: string) => void;
  isLoading: boolean;
  roomTitle: string;
  userPhone?: string | null;
}

const EnrollmentDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isLoading, 
  roomTitle, 
  userPhone 
}: EnrollmentDialogProps) => {
  const [phoneNumber, setPhoneNumber] = useState(userPhone || "");
  const [skipPhone, setSkipPhone] = useState(false);

  const handleConfirm = () => {
    // If user already has phone number or chose to skip, don't send phone
    if (userPhone || skipPhone) {
      onConfirm();
    } else if (phoneNumber.trim()) {
      onConfirm(phoneNumber.trim());
    } else {
      onConfirm(); // Allow enrollment without phone number
    }
  };

  const needsPhoneNumber = !userPhone && !skipPhone;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Enrollment Confirmation
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            <div className="space-y-3">
              <p className="font-medium">You are enrolling in: <span className="text-foreground">{roomTitle}</span></p>
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p className="text-amber-800 text-sm">
                  <strong>Important:</strong> Since this room has limited participants, please join only if you are sure you will attend. 
                  This is a community responsibility for defense preparation and should be taken seriously.
                </p>
              </div>

              {needsPhoneNumber && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number (Optional)
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send WhatsApp + Email notifications 15 minutes before the room starts
                  </p>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number (optional)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSkipPhone(true)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Skip phone number
                  </Button>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Enrolling..." : "Confirm Enrollment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollmentDialog;