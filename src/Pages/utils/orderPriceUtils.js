/**
 * calculateItemUnitPrice
 * النسخة النهائية المعتمدة لحساب سعر المنتج شاملاً كافة الإضافات والمتغيرات
 */
export const calculateItemUnitPrice = (baseProduct, selectedVariation = {}, selectedExtras = null) => {
  // 1. تحديد السعر الأساسي الابتدائي للمنتج (قبل الضريبة)
  // نستخدم price_after_discount أو price (السعر قبل الضريبة) وليس final_price/price_after_tax
  // لأن الضريبة تُحسب بشكل منفصل في useOrderCalculations
  let basePrice = parseFloat(
    baseProduct.price_after_discount ||
    baseProduct.price ||
    0
  );
  let additions = 0;

  // 2. حساب المتغيرات (Variations)
  if (baseProduct.variations) {
    baseProduct.variations.forEach(variation => {
      // سحب الاختيار المختار من الـ state أو البيانات المدمجة
      const selectedId = selectedVariation[variation.id] || variation.selected_option_id;
      if (!selectedId) return;

      // تحويل الاختيار لمصفوفة دائماً لضمان عمل الدالة مع الـ Single والـ Multiple
      const ids = Array.isArray(selectedId) ? selectedId : [selectedId];

      ids.forEach(id => {
        const opt = variation.options?.find(o => o.id === id);
        if (!opt) return;

        const optPrice = parseFloat(opt.price || opt.final_price || 0);
        const totalOptPrice = parseFloat(opt.total_option_price || 0);

        /**
         * منطق الفصل بين الحجم والإضافة:
         * - إذا كان النوع single وله total_option_price (مثل الأوزان)، نحدث السعر الأساسي
         * - إذا كان النوع multiple (مثل باتر فلاي) نجمع الـ price كإضافة
         */
        if (variation.type === 'single' && totalOptPrice > 0) {
          basePrice = totalOptPrice;
        } else {
          additions += optPrice;
        }
      });
    });
  }

  // 3. حساب الـ Extras و الـ Addons الخارجية
  if (selectedExtras !== null) {
    // ── المسار 1: استدعاء من المودال مع selectedExtras صريحة ──
    // نبحث عن كل ID في allExtras و addons (الـ catalog الكامل للمنتج)
    const allPossibleAddons = [
      ...(baseProduct.allExtras || []),
      ...(baseProduct.addons || [])
    ];
    selectedExtras.forEach(id => {
      const extra = allPossibleAddons.find(e => e.id === parseInt(id));
      if (extra) {
        additions += parseFloat(extra.price || extra.final_price || 0);
      }
    });
  } else {
    // ── المسار 2: استدعاء من الـ cart/order (item مخزن) ──

    // أولاً: الـ extras من allExtras (محفوظة كـ IDs في selectedExtras)
    const storedExtras = baseProduct.selectedExtras || [];
    if (storedExtras.length > 0) {
      const allExtrasCatalog = baseProduct.allExtras || [];
      storedExtras.forEach(id => {
        const extra = allExtrasCatalog.find(e => e.id === parseInt(id));
        if (extra) {
          additions += parseFloat(extra.price || extra.final_price || 0);
        }
      });
    }

    // ثانياً: الـ addons المحفوظة على الـ item (شكلها: [{ addon_id, quantity, price }])
    // نتعرف عليها بوجود addon_id (مش id) — السعر محفوظ جاهز فيها
    const storedAddons = baseProduct.addons || [];
    storedAddons.forEach(addon => {
      if (addon.addon_id !== undefined) {
        const qty = parseFloat(addon.quantity || addon.count || 1);
        additions += parseFloat(addon.price || 0) * qty;
      }
    });
  }

  // الإجمالي: (سعر الحجم المختار أو الأساسي) + (مجموع كل الإضافات والمتغيرات)
  return basePrice + additions;
};