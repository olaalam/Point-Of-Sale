/**
 * calculateItemUnitPrice
 * نفس منطق calculateAddonsTotal في ItemRow تماماً (اللي بيشتغل صح)
 * + منطق استبدال السعر الأساسي لو الـ variation عنده total_option_price
 */
export const calculateItemUnitPrice = (item) => {
  // ── السعر الأساسي الابتدائي ──────────────────────────────────────
  let basePrice = Number(item.final_price || item.price_after_discount || item.price || 0);
  let extras = 0;

  // ── 1. Variations ─────────────────────────────────────────────────
  // نفس الكود المستخدم في calculateAddonsTotal في ItemRow (شغال صح)
  if (item.variations && Array.isArray(item.variations)) {
    item.variations.forEach((v) => {
      const variationName = (v.name || "").toLowerCase();
      const isSize =
        variationName.includes('size') ||
        variationName.includes('حجم') ||
        variationName.includes('maqas') ||
        variationName.includes('مقاس');

      const selectedId = v.selected_option_id;
      if (selectedId === null || selectedId === undefined) return;

      const ids = Array.isArray(selectedId) ? selectedId : [selectedId];

      ids.forEach((optId) => {
        const opt = v.options?.find((o) => o.id === optId);
        if (!opt) return;

        const totalOptPrice = Number(opt.total_option_price || 0);

        if (totalOptPrice > 0 && !item.is_group_priced) {
          // يستبدل السعر الأساسي بالكامل (مثل سوشي 300 أو 350)
          basePrice = totalOptPrice;
        } else if (isSize && !item.is_group_priced) {
          // حجم → استبدال بـ final_price
          const sp = Number(opt.final_price || opt.price_after_tax || 0);
          if (sp > 0) basePrice = sp;
        } else {
          // إضافة عادية (باتر فلاي +65، 1/3 +16 ...)
          // ⚠️ || مش ?? عشان price=0 لا يحجب القيم التالية
          extras += Number(
            opt.price || opt.final_price || opt.price_after_tax || opt.total_option_price || 0
          );
        }
      });
    });
  }

  // ── 2. Extras (المختارة من قائمة allExtras) ───────────────────────
  if (item.selectedExtras?.length > 0 && item.allExtras?.length > 0) {
    item.selectedExtras.forEach((id) => {
      const extra = item.allExtras.find((e) => e.id === id);
      if (extra) {
        extras += Number(extra.final_price || extra.price_after_tax || extra.price || 0);
      }
    });
  }

  // ── 3. Addons ─────────────────────────────────────────────────────
  if (item.addons?.length > 0) {
    item.addons.forEach((addon) => {
      // format بعد add to cart: { addon_id, quantity, price }
      if (addon.addon_id !== undefined) {
        if (Number(addon.quantity) > 0) {
          extras += Number(addon.price || 0) * Number(addon.quantity);
        }
        return;
      }
      // format قديم
      const isSelected = addon.selected === true || Number(addon.quantity) > 0;
      if (isSelected && addon.price > 0) {
        extras += Number(addon.price) * Number(addon.quantity || 1);
      }
    });
  }

  return Number((basePrice + extras).toFixed(2));
};