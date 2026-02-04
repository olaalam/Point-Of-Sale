import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import SummaryRow from "./SummaryRow";
import Loading from "@/components/Loading";
import { Phone } from "lucide-react";
import { calculateItemUnitPrice } from "../utils/orderPriceUtils";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import { useGet } from "@/Hooks/useGet";
import { Textarea } from "@/components/ui/textarea";
import FreeDiscountPasswordModal from "../Checkout/FreeDiscountPasswordModal";
import { usePost } from "@/Hooks/usePost";

// مكون الطباعة
const PrintableOrder = React.forwardRef(
  ({ orderItems, calculations, orderType, tableId, t, restaurantInfo }, ref) => {
    const isArabic = localStorage.getItem("language") === "ar";

    // تحديد نصوص Order Type
    let orderTypeLabel = isArabic ? "تيك أواي" : "Takeaway";
    if (orderType === "dine_in") {
      orderTypeLabel = isArabic ? "صالة" : "Dine In";
    } else if (orderType === "delivery") {
      orderTypeLabel = isArabic ? "توصيل" : "Delivery";
    }

    const currentDate = new Date().toLocaleDateString(isArabic ? "ar-EG" : "en-US");
    const currentTime = new Date().toLocaleTimeString(isArabic ? "ar-EG" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          maxWidth: "76mm",
          margin: "0 auto",
          padding: "2px",
          fontFamily: "'Arial', 'Tahoma', sans-serif",
          fontSize: "13px",
          direction: isArabic ? "rtl" : "ltr",
          color: "#000",
          lineHeight: "1.4",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "8px",
            borderBottom: "2px solid #000",
            paddingBottom: "5px",
          }}
        >
          <h1 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "3px" }}>
            {restaurantInfo?.name || (isArabic ? "اسم المطعم" : "Restaurant Name")}
          </h1>
          <p style={{ fontSize: "11px", margin: "2px 0" }}>
            {restaurantInfo?.address || (isArabic ? "عنوان المطعم" : "Restaurant Address")}
          </p>
        </div>

        {/* Order Info Grid */}
        <div style={{ marginBottom: "8px", paddingBottom: "5px", borderBottom: "1px solid #000" }}>
          {orderType === "dine_in" && tableId && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "3px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                {isArabic ? "الطاولة" : "Table"}
              </span>
              <span style={{ fontSize: "18px", fontWeight: "bold" }}>{tableId}</span>
            </div>
          )}

          {orderType === "dine_in" && tableId && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "3px",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>
                {isArabic ? "رقم التحضير" : "preparation No."}
              </span>
              <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                {restaurantInfo?.prep}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "3px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>
              {isArabic ? "نوع الطلب" : "Order Type"}
            </span>
            <span style={{ fontWeight: "bold", fontSize: "13px" }}>{orderTypeLabel}</span>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "3px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: "bold" }}>
              {isArabic ? "التاريخ" : "Date"}
            </span>
            <span style={{ fontWeight: "bold", fontSize: "12px", direction: "ltr" }}>
              {currentDate} - {currentTime}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "8px",
            fontSize: "11px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#eee" }}>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px 2px",
                  textAlign: "center",
                  width: "15%",
                  fontWeight: "bold",
                }}
              >
                {isArabic ? "الكمية" : "Qty"}
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px 2px",
                  textAlign: isArabic ? "right" : "left",
                  width: "45%",
                  fontWeight: "bold",
                }}
              >
                {isArabic ? "الوجبة" : "Item"}
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px 2px",
                  textAlign: "center",
                  width: "20%",
                  fontWeight: "bold",
                }}
              >
                {isArabic ? "سعر" : "Price"}
              </th>
              <th
                style={{
                  border: "1px solid #000",
                  padding: "4px 2px",
                  textAlign: "center",
                  width: "20%",
                  fontWeight: "bold",
                }}
              >
                {isArabic ? "الإجمالي" : "Total"}
              </th>
            </tr>
          </thead>
          <tbody>
            {orderItems.map((item, index) => {
              const finalUnitPrice = calculateItemUnitPrice(item);
              // السعر الأساسي (زي اللي معروض في الـ UI)
              const basePrice = Number(item.final_price ?? item.price_after_discount ?? 0);

              // الإضافات (الفرق بين السعر الشامل والأساسي)
              const extras = finalUnitPrice - basePrice;

              const quantityForCalc =
                item.weight_status === 1
                  ? Number(item.quantity || item.count || 1)
                  : Number(item.count || 1);

              // الحساب الصحيح للإجمالي: (السعر الأساسي * الكمية/الوزن) + الإضافات
              // ده اللي هيطلعلك الـ 800 (500 * 1.5 + 50)
              const totalPrice = (item.weight_status === 1)
                ? ((basePrice * quantityForCalc) + extras).toFixed(2)
                : (finalUnitPrice * quantityForCalc).toFixed(2);

              const productName = isArabic
                ? item.name_ar || item.nameAr || item.name
                : item.name_en || item.nameEn || item.name;

              const displayQty =
                item.weight_status === 1 ? `${item.quantity} kg` : item.count;

              return (
                <React.Fragment key={item.temp_id || index}>
                  <tr>
                    <td style={{ border: "1px solid #000", padding: "3px 2px", textAlign: "center" }}>
                      <strong>{displayQty}</strong>
                    </td>
                    <td
                      style={{
                        border: "1px solid #000",
                        padding: "3px 4px",
                        textAlign: isArabic ? "right" : "left",
                        verticalAlign: "middle",
                      }}
                    >
                      <div>
                        <strong>{productName}</strong>

                        {/* Variations */}
                        {item.variations?.map((group, i) => {
                          const selected = Array.isArray(group.selected_option_id)
                            ? group.options?.find((opt) =>
                              group.selected_option_id.includes(opt.id)
                            )
                            : group.options?.find(
                              (opt) => opt.id === group.selected_option_id
                            );
                          return selected ? (
                            <div
                              key={i}
                              style={{ fontSize: "9px", color: "#555", marginTop: "2px" }}
                            >
                              • {group.name}: {selected.name}
                            </div>
                          ) : null;
                        })}

                        {/* Addons */}
                        {item.addons &&
                          Array.isArray(item.addons) &&
                          item.addons.map((addonGroup, i) =>
                            addonGroup.options
                              ?.filter((opt) => opt.selected || opt.quantity > 0)
                              .map((option, j) => (
                                <div
                                  key={`${i}-${j}`}
                                  style={{
                                    fontSize: "9px",
                                    color: "#0066cc",
                                    marginTop: "2px",
                                  }}
                                >
                                  • {option.name} (+{option.final_price.toFixed(2)})
                                </div>
                              ))
                          )}

                        {/* Notes */}
                        {item.notes && (
                          <div
                            style={{
                              fontSize: "9px",
                              color: "#d97706",
                              marginTop: "3px",
                              fontStyle: "italic",
                            }}
                          >
                            📝 {item.notes}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ border: "1px solid #000", padding: "3px 2px", textAlign: "center" }}>
                      {/* تعديل: عرض basePrice (الـ 500) بدل finalUnitPrice */}
                      {basePrice.toFixed(2)}
                    </td>
                    <td style={{ border: "1px solid #000", padding: "3px 2px", textAlign: "center", fontWeight: "bold" }}>
                      {totalPrice}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Totals Section */}
        <div style={{ marginTop: "8px", paddingTop: "5px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "3px",
              fontSize: "12px",
            }}
          >
            <span>{isArabic ? "المبلغ قبل الضريبة" : "Subtotal"}</span>
            <span style={{ fontWeight: "bold" }}>{calculations.subTotal.toFixed(2)}</span>
          </div>

          {calculations.taxDetails && calculations.taxDetails.length > 0 ? (
            calculations.taxDetails.map((tax, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "3px",
                  fontSize: "12px",
                }}
              >
                <span>
                  {tax.name} ({tax.amount}
                  {tax.type === "precentage" ? "%" : " EGP"})
                </span>
                <span style={{ fontWeight: "bold" }}>{tax.total.toFixed(2)}</span>
              </div>
            ))
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
                fontSize: "12px",
              }}
            >
              <span>{isArabic ? "الضريبة" : "Tax"}</span>
              <span style={{ fontWeight: "bold" }}>{calculations.totalTax.toFixed(2)}</span>
            </div>
          )}

          {calculations.totalOtherCharge > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "3px",
                fontSize: "12px",
              }}
            >
              <span>{isArabic ? "رسوم الخدمة" : "Service Fee"}</span>
              <span style={{ fontWeight: "bold" }}>
                {calculations.totalOtherCharge.toFixed(2)}
              </span>
            </div>
          )}
          {/* ← إضافة رسوم التوصيل */}
          {calculations.deliveryFee > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", fontSize: "12px" }}>
              <span>{isArabic ? "رسوم التوصيل" : "Delivery Fee"}</span>
              <span style={{ fontWeight: "bold" }}>{calculations.deliveryFee.toFixed(2)}</span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "16px",
              fontWeight: "bold",
              marginTop: "8px",
              borderTop: "1px dashed #000",
              paddingTop: "5px",
            }}
          >
            <span>{isArabic ? "الإجمالي الكلي" : "Grand Total"}</span>
            <span>{calculations.amountToPay.toFixed(2)}</span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: "15px",
            fontSize: "11px",
            borderTop: "1px dashed #000",
            paddingTop: "8px",
          }}
        >
          <p style={{ fontWeight: "bold" }}>
            {isArabic ? "شكراً لزيارتكم" : "Thank You For Your Visit"}
          </p>
          {restaurantInfo?.Phone && (
            <p
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "4px",
                marginTop: "4px",
              }}
            >
              <Phone size={12} />
              {restaurantInfo.Phone}
            </p>
          )}
        </div>
      </div>
    );
  }
);

// المكون الرئيسي
export default function OrderSummary({
  orderType,
  subTotal,
  totalTax,
  totalOtherCharge,
  serviceFeeData,
  taxDetails,
  totalAmountDisplay,
  amountToPay,
  selectedPaymentCount,
  onCheckout,
  offerManagement,
  isLoading,
  orderItemsLength,
  allItemsDone,
  orderItems,
  tableId,
  t,
  isCheckoutVisible,
  onPrint: externalOnPrint,
  notes,
  setNotes,
  selectedDiscountId,
  setSelectedDiscountId,
  freeDiscount,
  setFreeDiscount,
}) {
  const printRef = useRef();
  console.log("Current orderType:", orderType);

  // حساب القيم الحقيقية للطباعة باستخدام الدالة الموحدة
  const realSubTotal = orderItems.reduce((acc, item) => {
    const unitPrice = calculateItemUnitPrice(item);
    const basePrice = Number(item.final_price ?? item.price_after_discount ?? 0);
    const extras = unitPrice - basePrice;
    const qty = item.count ?? item.quantity ?? 1;

    // تطبيق نفس المنطق: الوزن للسعر الأساسي فقط
    const itemTotal = (item.weight_status === 1 || item.weight_status === "1")
      ? (basePrice * qty) + extras
      : (unitPrice * qty);

    return acc + itemTotal;
  }, 0);
  const realServiceFee = (serviceFeeData && ["dine_in", "take_away"].includes(orderType))
    ? (serviceFeeData.type === "precentage"
      ? (realSubTotal + totalTax) * (serviceFeeData.amount / 100)
      : serviceFeeData.amount)
    : 0;
  const selectedUserData = JSON.parse(sessionStorage.getItem("selected_user_data") || "{}");
  const deliveryFee = orderType === "delivery"
    ? Number(selectedUserData?.selectedAddress?.zone?.price || 0)
    : 0;

  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [discountCode, setDiscountCode] = useState('');
  const [isCheckingDiscount, setIsCheckingDiscount] = useState(false);
  const { data: discountListData, loading: discountsLoading } = useGet(
    "captain/discount_list"
  );
  const [selectedDiscountAmount, setSelectedDiscountAmount] = useState(0);

  useEffect(() => {
    if (!selectedDiscountId || discountsLoading) {
      setSelectedDiscountAmount(0);
      return;
    }

    const discountList = discountListData?.discount_list || [];
    const selected = discountList.find((d) => d.id === selectedDiscountId);

    if (!selected) {
      setSelectedDiscountAmount(0);
      return;
    }

    let amount = 0;
    if (selected.type === "precentage") {
      amount = parseFloat(amountToPay) * (selected.amount / 100);
    } else {
      amount = selected.amount;
    }

    setSelectedDiscountAmount(amount); // خليه number مش string
  }, [selectedDiscountId, discountListData, discountsLoading, amountToPay]);

  const [discountData, setDiscountData] = useState({ module: [], discount: 0 });
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [itemDiscountsAmount, setItemDiscountsAmount] = useState(0);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [tempFreeDiscount, setTempFreeDiscount] = useState("");
  const [isDiscountExpanded, setIsDiscountExpanded] = useState(false);
  const [activeDiscountTab, setActiveDiscountTab] = useState(null);
  const [discountError, setDiscountError] = useState(null);
  const { postData } = usePost();
  //discount permission 
  const userDataStr = sessionStorage.getItem("user");
  const userData = userDataStr ? JSON.parse(userDataStr) : {};
  const hasDiscountPermission = userData.discount_perimission === 1 || userData.discount_permission === 1; // دعم الإملاءين
  const hasFreeDiscountPermission = userData.free_discount === 1;

  // Apply Company Discount Code
  const handleApplyDiscount = async () => {
    if (!discountCode) {
      toast.error(t("PleaseEnterDiscountCode"));
      return;
    }

    setIsCheckingDiscount(true);
    setDiscountError(null);

    try {
      const response = await postData("cashier/check_discount_code", {
        code: discountCode,
      });
      if (response.success) {
        setAppliedDiscount(response.discount);
        toast.success(t("DiscountApplied", { discount: response.discount }));
      } else {
        setAppliedDiscount(0);
        setDiscountError("Invalid or Off discount code.");
        toast.error(t("InvalidOrOffDiscountCode"));
      }
    } catch (e) {
      console.log(e?.response?.data?.errors);

      setAppliedDiscount(0);
      setDiscountError(e?.response?.data?.errors || "Failed to validate discount code.");
      toast.error(e?.response?.data?.errors || t("FailedToValidateDiscountCode"));
    } finally {
      setIsCheckingDiscount(false);
    }
  };

  const percentageDiscountAmount = appliedDiscount > 0
    ? amountToPay * (appliedDiscount / 100)
    : discountData.module.includes(orderType)
      ? amountToPay * (discountData.discount / 100)
      : parseFloat(selectedDiscountAmount || 0);

  // تحويل كل القيم لـ numbers عشان الجمع يبقى صحيح والـ toFixed يشتغل
  const itemDiscountsNum = parseFloat(itemDiscountsAmount || 0);
  const percentageNum = parseFloat(percentageDiscountAmount || 0);
  const freeNum = parseFloat(freeDiscount || 0);
  const totalDiscountNum = parseFloat(totalDiscount || 0);

  const totalAppliedDiscountNum = itemDiscountsNum + percentageNum + freeNum + totalDiscountNum;
  const totalAppliedDiscount = totalAppliedDiscountNum.toFixed(2);

  const hasDiscount = totalAppliedDiscountNum > 0.01; // > 0.01 عشان نتجنب floating point errors زي 0.0000001

  const finalAmountAfterDiscount = (parseFloat(amountToPay) - totalAppliedDiscountNum).toFixed(2);

  const printCalculations = {
    subTotal: Number(realSubTotal.toFixed(2)),
    totalTax: totalTax,
    totalOtherCharge: Number(realServiceFee.toFixed(2)),
    taxDetails: taxDetails,
    deliveryFee: deliveryFee,
    amountToPay: Number(
      (realSubTotal + realServiceFee + (totalTax || 0) + deliveryFee).toFixed(2)
    ),
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank", "width=350,height=600");
    const printContents = printRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Order Receipt</title>
          <style>
            @media print {
              body { margin: 0; padding: 0; }
              @page { 
                margin: 5mm;
                size: 100% auto;
              }
            }
            * { box-sizing: border-box; }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const restaurantInfo = {
    name: sessionStorage.getItem("resturant_name") || "Restaurant Name",
    address: sessionStorage.getItem("restaurant_address") || "Restaurant Address",
    prep: sessionStorage.getItem("preparation_number"),
    Phone: sessionStorage.getItem("restaurant_phone") || "",
  };


  return (
    <div className="flex-shrink-0 bg-white border-t-2 border-gray-200 pt-6 mt-4">
      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <PrintableOrder
          ref={printRef}
          orderItems={orderItems}
          calculations={printCalculations}
          orderType={orderType}
          tableId={tableId}
          t={t}
          restaurantInfo={restaurantInfo}
        />
      </div>

      {/* Summary Display */}
      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
        <SummaryRow label={t("SubTotal")} value={subTotal} />

        {taxDetails && taxDetails.length > 0 ? (
          taxDetails.map((tax, index) => (
            <SummaryRow
              key={index}
              label={`${tax.name} (${tax.amount}${tax.type === "precentage" ? "%" : " EGP"})`}
              value={tax.total}
            />
          ))
        ) : (
          <SummaryRow label={t("Tax")} value={totalTax} />
        )}

        {["dine_in", "take_away"].includes(orderType) && totalOtherCharge > 0 && (
          <SummaryRow
            label={`${t("Service Fee")} (${serviceFeeData?.amount || 0}%)`}
            value={totalOtherCharge}
          />
        )}
        {deliveryFee > 0 && (
          <SummaryRow
            label={`${t("Delivery Fee")} (${selectedUserData?.selectedAddress?.zone?.zone || "—"})`}
            value={deliveryFee}
          />
        )}
      </div>
      {/* Notes Section */}
      <div className="mb-4">
        <label className="text-xs font-bold text-gray-500 mb-1 block">
          {t("Notes")}
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full min-h-[60px] text-sm"
          placeholder={t("Order Notes...")}
        />
      </div>

      {orderType === "dine_in" && (
        <>
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            <p className="text-gray-600">{t("TotalOrderAmount")}:</p>
            <p className="text-right text-lg font-semibold">
              {totalAmountDisplay.toFixed(2)} {t("EGP")}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 items-center mb-4">
            <p className="text-gray-600">
              {t("SelectedItems", { count: selectedPaymentCount })}:
            </p>
            <p className="text-right text-lg font-semibold text-green-600">
              {amountToPay.toFixed(2)} {t("EGP")}
            </p>
          </div>
          <hr className="my-4 border-t border-gray-300" />
        </>
      )}

      <div className="grid grid-cols-2 gap-4 items-center mb-6">
        <p className="text-bg-primary text-xl font-bold">{t("AmountToPay")}</p>
        <p className="text-right text-2xl font-bold text-green-700">
          {amountToPay.toFixed(2)} {t("EGP")}
        </p>
      </div>
      {hasDiscount && (
        <div className="space-y-4 mb-6">
          <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
            {/* Original - الإجمالي قبل كل الخصومات */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-800 font-semibold">{t("Original")}</span>
              <span className="font-semibold">
                {(parseFloat(amountToPay) + totalAppliedDiscountNum).toFixed(2)} EGP
              </span>
            </div>

            {/* Discount Row الوحيد - اسمه ولونه حسب الأولوية */}
            {hasDiscountPermission && (
              (() => {
                let discountLabel = t("Discount");
                let discountColor = "text-blue-600";

                if (freeNum > 0) {
                  discountLabel = t("Free Discount");
                  discountColor = "text-purple-600";
                } else if (appliedDiscount > 0) {
                  discountLabel = t("Company Discount");
                  discountColor = "text-green-600";
                } else if (selectedDiscountAmount > 0 || percentageNum > 0) {
                  const selected = discountListData?.discount_list?.find(d => d.id === selectedDiscountId);
                  discountLabel = selected?.name || t("List Discount");
                  discountColor = "text-blue-600";
                }

                return (
                  <div className={cn("flex justify-between text-sm font-semibold", discountColor)}>
                    <span>{discountLabel}</span>
                    <span>-{totalAppliedDiscount} EGP</span>
                  </div>
                );
              })()

            )}

            {/* Total After Discount */}
            <div className="flex justify-between font-bold text-2xl pt-3 border-t-2 border-dashed border-gray-400">
              <span className="text-[#800000]">{t("Total After Discount")}</span>
              <span className="text-[#800000]">{finalAmountAfterDiscount} EGP</span>
            </div>
          </div>
        </div>
      )}

      {/* Buttons Section */}
      <div className="flex flex-col gap-3 w-full">
        {offerManagement.approvedOfferData ? (
          <div className="w-full">
            <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4 text-center">
              <p className="font-bold text-green-800">
                {t("RewardItem")}: {offerManagement.approvedOfferData.product}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={async () => {
                  const success = await offerManagement.applyApprovedOffer();
                  if (success && onCheckout) onCheckout();
                }}
                className="bg-green-600 hover:bg-green-700 text-white text-lg h-14 font-bold flex-1 shadow-md transition-all active:scale-95"
                disabled={isLoading}
              >
                {isLoading ? <Loading /> : t("Apply & Checkout")}
              </Button>

              <Button
                onClick={offerManagement.cancelApprovedOffer}
                variant="outline"
                className="border-red-500 text-red-600 hover:bg-red-50 h-14 px-6"
                disabled={isLoading}
              >
                {t("Cancel")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-2 w-full">
            {/* Checkout Button - يأخذ المساحة الأكبر */}
            <Button
              onClick={onCheckout}
              className={cn(
                "col-span-8 h-14 text-white text-lg font-bold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95",
                isCheckoutVisible ? "bg-red-800" : "bg-bg-primary hover:bg-red-700"
              )}
              disabled={
                isLoading ||
                orderItemsLength === 0 ||
                (orderType === "dine_in" && selectedPaymentCount === 0)
              }
            >
              <span className="uppercase tracking-wide">{t("Checkout")}</span>
              <ChevronDown
                className={cn(
                  "w-5 h-5 transition-transform duration-300",
                  isCheckoutVisible && "rotate-180"
                )}
              />
            </Button>

            {/* Discount Button – يتغير اسمه حسب نوع الخصم المطبق */}
            {(() => {
              let discountLabel = t("Discount");
              let buttonColor = "text-blue-600 border-blue-600";

              if (parseFloat(freeDiscount || 0) > 0) {
                discountLabel = t("Free"); // أو t("Free Discount") لو عايز أطول
                buttonColor = "text-purple-600 border-purple-600"; // لون مميز للـ Free
              } else if (appliedDiscount > 0) {
                discountLabel = t("Company Discount");
                buttonColor = "text-green-600 border-green-600";
              } else if (selectedDiscountId) {
                discountLabel = t("List Discount");
                buttonColor = "text-blue-600 border-blue-600";
              }

              return (
                <button
                  onClick={() => setIsDiscountExpanded(!isDiscountExpanded)}
                  className={cn(
                    "col-span-4 h-14 rounded-md font-bold text-xs uppercase transition-all border-2 flex flex-col items-center justify-center gap-1 shadow-sm",
                    isDiscountExpanded
                      ? "bg-blue-600 text-white border-blue-600 shadow-inner"
                      : `bg-white ${buttonColor} hover:bg-gray-50`
                  )}
                >
                  <span className="leading-none">{discountLabel}</span>
                  {(parseFloat(freeDiscount || 0) > 0 || appliedDiscount > 0 || selectedDiscountId) && (
                    <span className="text-xs opacity-80">●</span> // مؤشر إن فيه خصم مطبق
                  )}
                </button>
              );
            })()}

            {/* Print Button - يظهر فقط في الـ Dine-in تحتهم */}
            {orderType === "dine_in" && allItemsDone && (
              <Button
                onClick={handlePrint}
                variant="outline"
                className="col-span-12 h-12 border-blue-600 text-blue-600 hover:bg-blue-50 text-md font-semibold mt-1"
              >
                {t("Print Receipt")}
              </Button>
            )}
          </div>
        )}
      </div>
      {isDiscountExpanded && hasDiscountPermission && (
        <div className="border border-gray-300 rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-300 mt-4">
          <div className="bg-gray-100 p-3 font-bold text-sm text-center border-b">
            {t("Discount Options")}
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3">
            <button
              onClick={() => setActiveDiscountTab(activeDiscountTab === "select" ? null : "select")}
              className={cn(
                "p-3 border-b border-r text-sm font-semibold transition-all",
                activeDiscountTab === "select"
                  ? "bg-blue-600 text-white"
                  : "bg-white hover:bg-gray-50"
              )}
            >
              {t("Select")}
            </button>

            <button
              onClick={() => setActiveDiscountTab(activeDiscountTab === "free" ? null : "free")}
              className={cn(
                "p-3 border-b border-r text-sm font-semibold transition-all",
                activeDiscountTab === "free"
                  ? "bg-purple-600 text-white"
                  : "bg-white hover:bg-gray-50"
              )}
            >
              {t("Free")}
            </button>

            <button
              onClick={() => setActiveDiscountTab(activeDiscountTab === "company" ? null : "company")}
              className={cn(
                "p-3 border-b text-sm font-semibold transition-all",
                activeDiscountTab === "company"
                  ? "bg-green-600 text-white"
                  : "bg-white hover:bg-gray-50"
              )}
            >
              {t("By Company")}
            </button>
          </div>

          {/* محتوى الـ Tab المختار */}
          {activeDiscountTab && (
            <div className="p-4 bg-gray-50">
              {activeDiscountTab === "select" && (
                <Select
                  value={String(selectedDiscountId || "0")}
                  onValueChange={(val) => setSelectedDiscountId(val === "0" ? null : parseInt(val))}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder={t("ChooseDiscount")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("NoDiscount")}</SelectItem>
                    {discountListData?.discount_list?.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name} ({d.amount}{d.type === "precentage" ? "%" : t("EGP")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {activeDiscountTab === "free" && hasFreeDiscountPermission && (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={t("EnterFreeDiscount")}
                    value={tempFreeDiscount}
                    onChange={(e) => setTempFreeDiscount(e.target.value)}
                    className="bg-white"
                  />
                  <Button
                    onClick={() => setPasswordModalOpen(true)}
                    disabled={!tempFreeDiscount || isLoading}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {t("Send")}
                  </Button>
                </div>
              )}

              {activeDiscountTab === "company" && (
                <div className="flex gap-2">
                  <Input
                    placeholder={t("EnterDiscountCode")}
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    className="bg-white"
                  />
                  <Button onClick={handleApplyDiscount} disabled={isCheckingDiscount}>
                    {t("Apply")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Modals remain below */}
<FreeDiscountPasswordModal
  isOpen={passwordModalOpen}
  onClose={() => {
    setPasswordModalOpen(false);
    setTempFreeDiscount(""); 
  }}
  onConfirm={async (password) => { // أضفنا async هنا
    const discountAmount = parseFloat(tempFreeDiscount);

    if (isNaN(discountAmount) || discountAmount <= 0) {
      toast.error(t("Please enter a valid amount"));
      return;
    }

    try {
      // تشغيل الـ API للتحقق من الباسوورد
      const response = await postData(`cashier/free_discount_check?password=${password}`, {});
      
      if (response.success) {
        // لو الباسوورد صح، نطبق الخصم
        setFreeDiscount(discountAmount.toFixed(2));
        toast.success(t("Free discount applied") + `: ${discountAmount} EGP`);
        
        // تنظيف الحالة وإغلاق المودال
        setTempFreeDiscount("");
        setPasswordModalOpen(false);
        setActiveDiscountTab(null);
      } else {
        // لو الباسوورد غلط (حسب رد الباك إند)
        toast.error(response.message || t("Invalid Password"));
      }
    } catch (error) {
      console.error("Discount Error:", error);
      toast.error(error?.response?.data?.message || t("Verification failed"));
    }
  }}
/>
    </div>
  );
}