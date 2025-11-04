// src/pages/InvoicePage.jsx
import React from "react";
import ReceiptPrinter from "./ReceiptPrinter";
import { toast } from "react-toastify"; 

const InvoicePage = () => {
  return (
    <ReceiptPrinter
      receiptData
      onClose={() => toast.info("the receipt window is closed")} 
    />
  );
};

export default InvoicePage;
