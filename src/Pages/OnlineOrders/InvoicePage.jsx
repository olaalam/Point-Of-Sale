import React from "react";
import { useParams } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";

const InvoicePage = () => {
    const { id } = useParams();
    const { data, isLoading } = useGet(`cashier/orders/invoice/${id}`);

    if (isLoading) return <Loading />;
    if (!data) return <p className="text-center mt-10">No Invoice Data Found</p>;

    const order = data.order;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-8 max-w-2xl mx-auto bg-white" id="printable-invoice">
            {/* زر الطباعة - يختفي عند الطباعة الفعلية */}
            <div className="flex justify-end mb-6 no-print">
                <button
                    onClick={handlePrint}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    طباعة الفاتورة (Print)
                </button>
            </div>

            {/* تصميم الفاتورة */}
            <div className="border p-6 rounded-md">
                <div className="text-center border-b pb-4 mb-4">
                    <h1 className="text-2xl font-bold">Food2Go</h1>
                    <p className="text-gray-500">{order.branch?.name} - {order.branch?.address}</p>
                    <p className="text-sm">هاتف: {order.branch?.phone}</p>
                </div>

                <div className="flex justify-between mb-6 text-sm">
                    <div>
                        <p><strong>رقم الطلب:</strong> #{order.order_number}</p>
                        <p><strong>التاريخ:</strong> {order.order_date} {order.order_time}</p>
                    </div>
                    <div className="text-right">
                        <p><strong>العميل:</strong> {order.user?.name}</p>
                        <p><strong>الهاتف:</strong> {order.user?.phone}</p>
                    </div>
                </div>

                <table className="w-full text-left border-collapse mb-6">
                    <thead>
                        <tr className="bg-gray-100 text-right">
                            <th className="p-2 border">المنتج</th>
                            <th className="p-2 border">الكمية</th>
                            <th className="p-2 border">السعر</th>
                        </tr>
                    </thead>
                    <tbody className="text-right">
                        {order.order_details.map((item, index) => (
                            <tr key={index}>
                                <td className="p-2 border">
                                    {item.product?.name}
                                    {item.variations?.map(v => v.options.map(opt => (
                                        <span key={opt.id} className="block text-xs text-gray-500">- {opt.name}</span>
                                    )))}
                                </td>
                                <td className="p-2 border">{item.product?.count}</td>
                                <td className="p-2 border">{item.product?.price_after_tax} ج.م</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t pt-4 text-right space-y-1">
                    <div className="flex justify-between">
                        <span>المجموع الفرعي:</span>
                        <span>{order.amount - order.total_tax - (order.address?.zone?.price || 0)} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                        <span>الضريبة:</span>
                        <span>{order.total_tax} ج.م</span>
                    </div>
                    <div className="flex justify-between">
                        <span>خدمة التوصيل:</span>
                        <span>{order.address?.zone?.price || 0} ج.م</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t mt-2 pt-2">
                        <span>الإجمالي الكلي:</span>
                        <span>{order.amount} ج.م</span>
                    </div>
                </div>

                <div className="mt-10 text-center text-xs text-gray-400">
                    Powered by Food2Go - food2go.online
                    <br />
                    شكراً لتعاملكم معنا!
                </div>
            </div>

            {/* CSS لإخفاء الأزرار عند الطباعة */}
            <style>{`
  @media print {
    /* إخفاء كل العناصر */
    body * {
      visibility: hidden;
    }
    
    /* إظهار حاوية الفاتورة فقط */
    #printable-invoice, #printable-invoice * {
      visibility: visible;
    }

    #printable-invoice {
      position: static; /* نغيرها من absolute لـ static */
      width: 100%;
      max-width: 800px; /* يمكنك التحكم في العرض الأقصى للفاتورة هنا */
      margin: 0 auto;  /* هذا هو السر في التوسيط */
      padding: 40px;   /* زيادة الهوامش الداخلية لتكون مريحة للعين */
    }

    /* إخفاء زر الطباعة */
    .no-print {
      display: none !important;
    }

    /* ضبط الصفحة لإزالة العناوين الافتراضية للمتصفح */
    @page {
      size: auto;
      margin: 10mm; /* إضافة هامش بسيط للصفحة نفسها لضمان عدم القص عند الطباعة */
    }

    /* تحسين شكل الجداول */
    table {
      width: 100% !important;
      border-collapse: collapse;
    }
    
    /* لضمان خلفية الجدول تظهر في الطباعة (اختياري) */
    .bg-gray-100 {
      background-color: #f3f4f6 !important;
      -webkit-print-color-adjust: exact;
    }
  }
`}</style>
        </div>
    );
};

export default InvoicePage;