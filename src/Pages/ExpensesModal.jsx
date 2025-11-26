import React, { useState } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

export default function ExpensesModal({ onClose }) {
    const { data, loading } = useGet("cashier/expenses_list/lists");
    const { postData } = usePost();
  const { t } = useTranslation();

    const [expense_id, setExpenseId] = useState("");
    const [category_id, setCategoryId] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    // ----------------------------
    // FIX: Read single ID (not array)
    // ----------------------------
    const storedAcc = sessionStorage.getItem("financial_account");
    let initialFinancialId = "";

    try {
        const parsed = JSON.parse(storedAcc);
        // If it's array → take the first account ID
        if (Array.isArray(parsed) && parsed.length > 0) {
            initialFinancialId = parsed[0].id;
        }
        // If it's a single object → take ID
        else if (parsed?.id) {
            initialFinancialId = parsed.id;
        }
    } catch { 
        // Ignore JSON parse errors
    }

    const [financial_account_id, setFinancialAccountId] = useState(initialFinancialId);

    const handleSubmit = async () => {
        if (!expense_id || !category_id || !amount) {
            toast.error(t("Pleasefillrequiredfields"));
            return;
        }

        if (!financial_account_id) {
            toast.error(t("Pleaseselectfinancialaccount"));
            return;
        }

        const body = {
            expense_id,
            category_id,
            amount,
            financial_account_id,
            note,
        };

        try {
            await postData("cashier/expenses_list/add", body);
            toast.success(t("ExpenseAdded"));
            onClose();
        } catch (err) {
            toast.error(err?.message || "Failedtoaddexpense");
        }
    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/60  flex items-center justify-center z-[9999] ">
            <div className="bg-white rounded-xl p-6 w-[95%] max-w-md shadow-xl overflow-y-auto max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex items-center justify-between mb-4 relative">
                    <h2 className="text-xl font-bold  flex-1">
                        {t("AddExpense")}
                    </h2>

                    <button
                        onClick={() => {
                            onClose();
                        }}
                        className="text-black text-xl font-bold"
                    >
                        X
                    </button>
                </div>

                {/* Expense */}
<label className="block font-semibold mb-1">{t("Expense")}</label>
<input
    type="text"
    value={expense_id}
    onChange={(e) => setExpenseId(e.target.value)}
    placeholder={t("EnterExpense")}
    className="w-full p-2 border rounded mb-3"
/>


                {/* Category */}
                <label className="block font-semibold mb-1">{t("Category")}</label>
                <select
                    value={category_id}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2 border rounded mb-3"
                >
                    <option value="">{t("SelectCategory")}</option>
                    {data?.categories?.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                {/* Amount */}
                <label className="block font-semibold mb-1">{t("Amount")}</label>
<input
    type="number"
    value={amount}
    onChange={(e) => {
        const val = Number(e.target.value);
        if (val >= 0) setAmount(e.target.value);
    }}
    className="w-full p-2 border rounded mb-3"
    placeholder={t("Enteramount")}
    min="1"
/>


                {/* Note */}
                <label className="block font-semibold mb-1">{t("Note")}</label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2 border rounded mb-3"
                    placeholder="Optional note"
                />

                {/* FINANCIAL ACCOUNT */}
                <label className="block font-semibold mb-1">{t("FinancialAccount")}</label>
                <select
                    value={financial_account_id}
                    onChange={(e) => setFinancialAccountId(e.target.value)}
                    className="w-full p-2 border rounded mb-3"
                >
                    <option value="">{t("SelectAccount")}</option>
                    {data?.financial?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                            {acc.name} - {acc.details}
                        </option>
                    ))}
                </select>


                <button
                    onClick={handleSubmit}
                    className="px-6 py-4 bg-bg-primary text-white rounded hover:bg-red-700 w-full"
                >
                    {t("add")}
                </button>
            </div>
        </div>
    );
}
