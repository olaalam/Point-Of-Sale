/**
 * calculateItemUnitPrice
 * النسخة النهائية المعتمدة لحساب سعر المنتج شاملاً كافة الإضافات والمتغيرات
 */
export const calculateItemUnitPrice = (baseProduct, selectedVariation = {}, selectedExtras = []) => {
  // 1. تحديد السعر الأساسي الابتدائي للمنتج (مثلاً 46.25)[cite: 1, 3]
  let basePrice = parseFloat(baseProduct.final_price || baseProduct.price || 0);
  let additions = 0;

  // 2. حساب المتغيرات (Variations)[cite: 2, 3]
  if (baseProduct.variations) {
    baseProduct.variations.forEach(variation => {
      // سحب الاختيار المختار من الـ state أو البيانات المدمجة[cite: 2, 3]
      const selectedId = selectedVariation[variation.id] || variation.selected_option_id;
      if (!selectedId) return;

      // تحويل الاختيار لمصفوفة دائماً لضمان عمل الدالة مع الـ Single والـ Multiple[cite: 1, 3]
      const ids = Array.isArray(selectedId) ? selectedId : [selectedId];

      ids.forEach(id => {
        const opt = variation.options?.find(o => o.id === id);
        if (!opt) return;

        const optPrice = parseFloat(opt.price || opt.final_price || 0);
        const totalOptPrice = parseFloat(opt.total_option_price || 0);

        /**
         * منطق الفصل بين الحجم والإضافة:
         * - إذا كان النوع single وله total_option_price (مثل الأوزان)، نحدث السعر الأساسي[cite: 2, 3]
         * - إذا كان النوع multiple (مثل باتر فلاي) نجمع الـ price كإضافة
         */
        if (variation.type === 'single' && totalOptPrice > 0) {
          basePrice = totalOptPrice;
        } else {
          // جمع سعر الإضافة (مثلاً 65.00) فوق السعر الأساسي
          additions += optPrice;
        }
      });
    });
  }

  // 3. حساب الـ Extras و الـ Addons الخارجية[cite: 1, 3]
  const allPossibleAddons = [
    ...(baseProduct.allExtras || []),
    ...(baseProduct.addons || [])
  ];

  if (selectedExtras && selectedExtras.length > 0) {
    selectedExtras.forEach(id => {
      const extra = allPossibleAddons.find(e => e.id === parseInt(id));
      if (extra) {
        additions += parseFloat(extra.final_price || extra.price || 0);
      }
    });
  }

  // الإجمالي: (سعر الحجم المختار أو الأساسي) + (مجموع كل الإضافات والمتغيرات)[cite: 2, 3]
  return basePrice + additions;
};