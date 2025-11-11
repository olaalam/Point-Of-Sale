// src/pages/InvoicePage.jsx
import React from "react";
import ReceiptPrinter from "./ReceiptPrinter";
import { toast } from "react-toastify"; 

const InvoicePage = () => {
  return (
<ReceiptPrinter
  receiptData={{
    copyNumber: 1,
    table: "T-05",
    cashier: "Ola",
    date: new Date().toLocaleString(),
    invoiceNumber: "INV-000123",
    items: [
      { qty: 2, name: "Latte", price: 40, total: 80 },
      { qty: 1, name: "Cheesecake", price: 55, total: 55 },
    ],
    subtotal: 135,
    discount: 10,
    tax: 5,
    total: 130,
  }}
  onClose={() => toast.info("the receipt window is closed")}
  autoPrint={true}
/>

  );
};

export default InvoicePage;
