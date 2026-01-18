import React from "react";
import { UserCheck, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Loading from "@/components/Loading";

export default function CaptainSelectionModal({ 
  isOpen, 
  onOpenChange, 
  captainsData, 
  isLoading, 
  t, 
  disabled 
}) {
    
  const handleCaptainSelect = (captain) => {
    sessionStorage.setItem("selected_captain_id", captain.id);
    sessionStorage.setItem("selected_captain_name", captain.name);
    onOpenChange(false); // إغلاق المودال
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          disabled={disabled}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2"
        >
          <UserCheck size={16} />
          {t("SelectCaptain") || "تعيين كابتن"}
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-white sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-right">
            {t("ChooseCaptain") || "اختر الكابتن للطلبات المختارة"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2 py-4">
          {isLoading ? (
            <div className="flex justify-center py-4"><Loading /></div>
          ) : (
            captainsData?.captain_orders?.map((captain) => (
              <Button
                key={captain.id}
                variant="outline"
                className="flex justify-between items-center hover:border-blue-600 hover:bg-blue-50 group px-4 py-6"
                onClick={() => handleCaptainSelect(captain)}
              >
                <ChevronLeft size={16} className="text-gray-400 group-hover:text-blue-600" />
                <span className="font-semibold text-gray-700 group-hover:text-blue-700">
                  {captain.name}
                </span>
              </Button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}