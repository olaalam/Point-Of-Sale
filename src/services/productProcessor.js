// src/services/productProcessor.js

export const buildProductPayload = (item) => {
  // 1. تجميع الـ Variations (بناءً على الهيكل اللي بيبعته المودال)
  // بنحول الـ Object { variation_id: option_id } لمصفوفة بيفهمها الـ API
  const groupedVariations = Object.entries(item.selectedVariation || {}).map(([vId, oId]) => ({
    variation_id: vId.toString(),
    option_id: Array.isArray(oId) ? oId.map(id => id.toString()) : [oId.toString()]
  }));

  // 2. الـ Addons (بناخدها جاهزة من اللي المودال بعته بدل ما نلف عليها تاني)
  const addonItems = (item.addons || []).map(addon => ({
    addon_id: addon.addon_id.toString(),
    count: (addon.quantity || addon.count || 1).toString(),
    price: (addon.price || 0).toString()
  }));

  // 3. الـ Extras (المعرفات فقط)
  const extraIds = (item.selectedExtras || []).map(id => id.toString());

  // 4. بناء الـ Payload النهائي المتوافق مع API الـ Cashier
  return {
    product_id: item.id.toString(),
    count: (item.quantity || item.count || 1).toString(),
    note: (item.notes || "").trim() || "No special instructions",
    // السعر هنا لازم يكون سعر الوحدة الواحدة شامل الإضافات والـ Variations
    price: (item.price || 0).toString(), 
    addons: addonItems,
    variation: groupedVariations,
    exclude_id: (item.selectedExcludes || []).map(id => id.toString()),
    extra_id: extraIds,
  };
};