// src/components/PasswordConfirmModal.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

export default function PasswordConfirmModal({ onConfirm, onCancel, loading }) {
  const [password, setPassword] = useState("");
  const { t } = useTranslation();

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(password);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full">
        <h3 className="text-xl font-bold mb-4 text-center">
          {t("ConfirmShiftClosure")}
        </h3>
        <p className="text-gray-600 text-center mb-6">
          {t("EnterPasswordToCloseShift")}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl tracking-widest"
            placeholder="•••"
            autoFocus
            required
            disabled={loading}
          />

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 bg-gray-300 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
            >
              {loading ? "..." : t("Confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}