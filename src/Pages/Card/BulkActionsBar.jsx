import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// استيراد مكونات الـ Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PREPARATION_STATUSES, statusOrder } from "./constants";

export default function BulkActionsBar({
  bulkStatus,
  setBulkStatus,
  selectedItems,
  onApplyStatus,
  onTransferOrder,
  isLoading,
  currentLowestStatus,
  t,
}) {
  // حالة للتحكم في غلق المودال بعد التأكيد
  const [isOpen, setIsOpen] = useState(false);

  const handleConfirmTransfer = () => {
    onTransferOrder(selectedItems); // تنفيذ النقل
    setIsOpen(false); // إغلاق المودال
  };

  return (
    <div className="flex items-center justify-start mb-4 gap-4 flex-wrap p-4 bg-white rounded-lg shadow-md">
      {/* ... (الجزء الخاص بـ Select و Apply Status كما هو) ... */}
      
      <Select value={bulkStatus} onValueChange={setBulkStatus}>
        <SelectTrigger className="w-[200px] border-gray-300 rounded-md shadow-sm px-4 py-2 bg-white">
          <SelectValue placeholder="-- Choose Status --" />
        </SelectTrigger>
        <SelectContent className="bg-white border border-gray-200">
          {Object.entries(PREPARATION_STATUSES)
            .filter(([key]) => statusOrder.indexOf(key) >= statusOrder.indexOf(currentLowestStatus))
            .map(([key, value]) => (
              <SelectItem key={key} value={key} className="px-4 py-2 hover:bg-gray-100 cursor-pointer">
                <div className="flex items-center gap-2">
                  <value.icon size={16} className={value.color} />
                  <span>{value.label}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Button
        onClick={onApplyStatus}
        className="bg-bg-primary text-white hover:bg-red-700 text-sm"
        disabled={selectedItems.length === 0 || !bulkStatus || isLoading}
      >
        {t("ApplyStatus", { count: selectedItems.length })}
      </Button>

      {/* 🟢 استخدام الـ Dialog للتأكيد */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            disabled={selectedItems.length === 0 || isLoading}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm flex items-center gap-1"
          >
            {t("ChangeTable") || "نقل إلى طاولة"}
            {selectedItems.length > 0 && ` (${selectedItems.length})`}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="bg-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-right">
              {t("ConfirmTransfer") || "تأكيد عملية النقل"}
            </DialogTitle>
            <DialogDescription className="text-right pt-2">
              {t("AreYouSureTransferItems") || "أنت على وشك الانتقال لاختيار طاولة جديدة لنقل العناصر المختارة. هل تريد الاستمرار؟"}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-row-reverse gap-2 sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              {t("Cancel") || "إلغاء"}
            </Button>
            <Button
              type="button"
              className="bg-purple-600 text-white hover:bg-purple-700"
              onClick={handleConfirmTransfer}
            >
              {t("Confirm") || "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}