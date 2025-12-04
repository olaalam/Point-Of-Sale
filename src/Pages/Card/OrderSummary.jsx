import React, { useRef } from "react";
import { Button } from "@/components/ui/button";
import SummaryRow from "./SummaryRow";
import Loading from "@/components/Loading";

// مكون الطباعة بنفس ديزاين الكاشير ريسيبت
const PrintableOrder = React.forwardRef(({ orderItems, calculations, orderType, tableId, t, restaurantInfo }, ref) => {
  const isArabic = localStorage.getItem('language') === 'ar';
  
  const calculatePriceWithAddons = (item) => {
    let basePrice = Number(item.originalPrice || item.price || 0);
    let addonsTotal = 0;

    if (item.addons && Array.isArray(item.addons)) {
      item.addons.forEach((addonGroup) => {
        if (addonGroup.options && Array.isArray(addonGroup.options)) {
          addonGroup.options.forEach((option) => {
            if (option.selected || option.quantity > 0) {
              const qty = option.quantity || 1;
              addonsTotal += Number(option.price || 0) * qty;
            }
          });
        }
      });
    }

    if (item.extras && Array.isArray(item.extras)) {
      item.extras.forEach((extra) => {
        addonsTotal += Number(extra.price || 0) * (extra.quantity || 1);
      });
    }

    return basePrice + addonsTotal;
  };

  // تحديد نصوص Order Type
  let orderTypeLabel = isArabic ? 'تيك أواي' : 'Takeaway';
  if (orderType === 'dine_in') {
    orderTypeLabel = isArabic ? 'صالة' : 'Dine In';
  } else if (orderType === 'delivery') {
    orderTypeLabel = isArabic ? 'توصيل' : 'Delivery';
  }

  const currentDate = new Date().toLocaleDateString(isArabic ? 'ar-EG' : 'en-US');
  const currentTime = new Date().toLocaleTimeString(isArabic ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <div ref={ref} style={{
      width: '100%',
      maxWidth: '76mm',
      margin: '0 auto',
      padding: '2px',
      fontFamily: "'Arial', 'Tahoma', sans-serif",
      fontSize: '13px',
      direction: isArabic ? 'rtl' : 'ltr',
      color: '#000',
      lineHeight: '1.4'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '3px' }}>
          {restaurantInfo?.name || (isArabic ? 'اسم المطعم' : 'Restaurant Name')}
        </h1>
        <p style={{ fontSize: '11px', margin: '2px 0' }}>
          {restaurantInfo?.address || (isArabic ? 'عنوان المطعم' : 'Restaurant Address')}
        </p>
      </div>

      {/* Order Info Grid */}
      <div style={{ marginBottom: '8px', paddingBottom: '5px', borderBottom: '1px solid #000' }}>
        {/* Table Number for Dine In */}
        {orderType === 'dine_in' && tableId && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
              {isArabic ? 'الطاولة' : 'Table'}
            </span>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {tableId}
            </span>
          </div>
        )}

        {/* Order Type */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
            {isArabic ? 'نوع الطلب' : 'Order Type'}
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '13px' }}>
            {orderTypeLabel}
          </span>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
            {isArabic ? 'التاريخ' : 'Date'}
          </span>
          <span style={{ fontWeight: 'bold', fontSize: '12px', direction: 'ltr' }}>
            {currentDate} - {currentTime}
          </span>
        </div>
      </div>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#eee' }}>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '15%', fontWeight: 'bold' }}>
              {isArabic ? 'الكمية' : 'Qty'}
            </th>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: isArabic ? 'right' : 'left', width: '45%', fontWeight: 'bold' }}>
              {isArabic ? 'الوجبة' : 'Item'}
            </th>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>
              {isArabic ? 'سعر' : 'Price'}
            </th>
            <th style={{ border: '1px solid #000', padding: '4px 2px', textAlign: 'center', width: '20%', fontWeight: 'bold' }}>
              {isArabic ? 'الإجمالي' : 'Total'}
            </th>
          </tr>
        </thead>
        <tbody>
          {orderItems.map((item, index) => {
            const finalUnitPrice = orderType === "dine_in"
              ? calculatePriceWithAddons(item)
              : Number(item.price) || 0;

            const quantityForCalc = item.weight_status === 1 
              ? Number(item.quantity || item.count || 1)
              : Number(item.count || 1);

            const totalPrice = (finalUnitPrice * quantityForCalc).toFixed(2);
            const productName = isArabic 
              ? (item.name_ar || item.nameAr || item.name) 
              : (item.name_en || item.nameEn || item.name);

            const displayQty = item.weight_status === 1 
              ? `${item.quantity} kg` 
              : item.count;

            return (
              <React.Fragment key={item.temp_id || index}>
                <tr>
                  <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <strong>{displayQty}</strong>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: isArabic ? 'right' : 'left', verticalAlign: 'middle' }}>
                    <div>
                      <strong>{productName}</strong>
                      
                      {/* Variations */}
                      {item.variations?.map((group, i) => {
                        const selected = Array.isArray(group.selected_option_id)
                          ? group.options?.find(opt => group.selected_option_id.includes(opt.id))
                          : group.options?.find(opt => opt.id === group.selected_option_id);
                        return selected ? (
                          <div key={i} style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                            • {group.name}: {selected.name}
                          </div>
                        ) : null;
                      })}

                      {/* Addons */}
                      {item.addons && Array.isArray(item.addons) && item.addons.map((addonGroup, i) => (
                        addonGroup.options?.filter(opt => opt.selected || opt.quantity > 0).map((option, j) => (
                          <div key={`${i}-${j}`} style={{ fontSize: '9px', color: '#0066cc', marginTop: '2px' }}>
                            • {option.name} (+{option.price.toFixed(2)})
                          </div>
                        ))
                      ))}

                      {/* Notes */}
                      {item.notes && (
                        <div style={{ fontSize: '9px', color: '#d97706', marginTop: '3px', fontStyle: 'italic' }}>
                          📝 {item.notes}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle' }}>
                    {finalUnitPrice.toFixed(2)}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '3px 2px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 'bold' }}>
                    {totalPrice}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Totals Section */}
      <div style={{ marginTop: '8px', paddingTop: '5px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
          <span>{isArabic ? 'المبلغ قبل الضريبة' : 'Subtotal'}</span>
          <span style={{ fontWeight: 'bold' }}>{calculations.subTotal.toFixed(2)}</span>
        </div>
            
        {calculations.taxDetails && calculations.taxDetails.length > 0 ? (
          calculations.taxDetails.map((tax, index) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
              <span>
                {tax.name} ({tax.amount}{tax.type === "precentage" ? "%" : " EGP"})
              </span>
              <span style={{ fontWeight: 'bold' }}>{tax.total.toFixed(2)}</span>
            </div>
          ))
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
            <span>{isArabic ? 'الضريبة (15%)' : 'VAT (15%)'}</span>
            <span style={{ fontWeight: 'bold' }}>{calculations.totalTax.toFixed(2)}</span>
          </div>
        )}

        {calculations.totalOtherCharge > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '12px' }}>
            <span>{isArabic ? 'رسوم الخدمة' : 'Service Fee'}</span>
            <span style={{ fontWeight: 'bold' }}>{calculations.totalOtherCharge.toFixed(2)}</span>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          fontSize: '16px', 
          fontWeight: 'bold', 
          marginTop: '8px', 
          borderTop: '1px dashed #000', 
          paddingTop: '5px' 
        }}>
          <span>{isArabic ? 'الإجمالي الكلي' : 'Grand Total'}</span>
          <span>{calculations.amountToPay.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '11px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
        <p style={{ fontWeight: 'bold' }}>
          {isArabic ? 'شكراً لزيارتكم' : 'Thank You For Your Visit'}
        </p>
      </div>
    </div>
  );
});

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
  onSaveAsPending,
  offerManagement,
  isLoading,
  orderItemsLength,
  allItemsDone,
  orderItems,
  tableId,
  t,
  onPrint: externalOnPrint,
}) {
  const printRef = useRef();

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
                size: 76mm auto;
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

  const calculations = {
    subTotal,
    totalTax,
    totalOtherCharge,
    taxDetails,
    amountToPay,
  };

  const restaurantInfo = {
    name: localStorage.getItem('restaurant_name') || 'Restaurant Name',
    address: localStorage.getItem('restaurant_address') || 'Restaurant Address'
  };

  return (
    <div className="flex-shrink-0 bg-white border-t-2 border-gray-200 pt-6 mt-4">
      {/* Hidden Print Component */}
      <div style={{ display: "none" }}>
        <PrintableOrder
          ref={printRef}
          orderItems={orderItems}
          calculations={calculations}
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
              label={`${tax.name} (${tax.amount}${
                tax.type === "precentage" ? "%" : " EGP"
              })`}
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

      {/* ✅ الجزء المعدّل: نشيل الـ Checkout ونظهر Apply Offer */}
<div className="flex  items-center gap-4 w-full">
  {/* إذا كان في عرض معتمد → زر Apply Offer فقط */}
  {offerManagement.approvedOfferData ? (
    <div className="w-full">
      <div className="bg-green-50 border border-green-300 rounded-lg p-4 mb-4 text-center">
        <p className="font-bold text-green-800">
          {t("RewardItem")}: {offerManagement.approvedOfferData.product}
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <Button
          onClick={async () => {
            const success = await offerManagement.applyApprovedOffer();
            if (success && onCheckout) onCheckout(); // نروح للدفع فورًا
          }}
          className="bg-green-600 hover:bg-green-700 text-white text-lg px-10 py-6 font-bold flex-1"
          disabled={isLoading}
        >
          {isLoading ? <Loading /> : <>Apply Offer & Checkout</>}
        </Button>

        <Button
          onClick={offerManagement.cancelApprovedOffer}
          variant="outline"
          className="border-red-500 text-red-600 hover:bg-red-50"
          disabled={isLoading}
        >
          {t("Cancel")}
        </Button>
      </div>
    </div>
  ) : (
    /* الحالة العادية: Checkout */
    <div className="flex gap-4 w-full">
      <Button
        onClick={onCheckout}
        className="bg-bg-primary text-white hover:bg-red-700 text-lg px-8 py-3"
        disabled={isLoading || orderItemsLength === 0 || (orderType === "dine_in" && selectedPaymentCount === 0)}
      >
        {t("Checkout")}
      </Button>

      {/* باقي الأزرار */}
      {orderType === "dine_in" && allItemsDone && (
        <Button onClick={handlePrint} className="bg-blue-600 text-white hover:bg-blue-700 text-lg px-8 py-3">
          Print
        </Button>
      )}

      {(orderType === "take_away" || orderType === "delivery") && (
        <Button onClick={onSaveAsPending} className="bg-orange-600 text-white hover:bg-orange-700 text-lg px-8 py-3">
          {t("SaveasPending")}
        </Button>
      )}
    </div>
  )}
</div>
    </div>
  );
}