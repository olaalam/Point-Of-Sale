// orderPriceUtils.js
export const calculateItemUnitPrice = (item) => {
  // السعر الأساسي بعد الخصم (هذا هو الأساس دايماً)
  const basePrice = Number(item.price_after_discount ?? item.price ?? 0);

  let extras = 0;

  // 1. Variations (الاختيار الإجباري أو الاختياري من المجموعات)
  if (item.selectedVariation && item.variations?.length > 0) {
    Object.entries(item.selectedVariation).forEach(([groupId, optionId]) => {
      const group = item.variations.find((g) => String(g.id) === String(groupId));
      if (!group) return;

      const option = group.options?.find((o) => String(o.id) === String(optionId));
      
      if (option) {
        extras += Number(option.price_after_discount ?? option.price ?? 0);
      }
    });
  }

  // 2. Extras (الإضافات المستقلة - Checkbox عادةً)
  if (item.selectedExtras?.length > 0 && item.allExtras?.length > 0) {
    item.selectedExtras.forEach((id) => {
      const extra = item.allExtras.find((e) => String(e.id) === String(id));
      if (extra) {
        extras += Number(
          extra.price_after_discount ??
          extra.price_after_tax ??
          extra.price ??
          0
        );
      }
    });
  }

  // 3. Addons (مجموعات الإضافات - Radio / Checkbox / Quantity)
  if (item.addons?.length > 0) {
    item.addons.forEach((addonGroup) => {
      // ── الحالات الشائعة لمجموعات الإضافات ──

      // أ. إذا كان السعر مربوط بالمجموعة ككل (نادر نسبياً)
      //    ويحسب فقط لو تم اختيار المجموعة
      if (addonGroup.price > 0 && addonGroup.selected === true) {
        extras += Number(addonGroup.price);
      }

      // ب. الحالة الأكثر شيوعاً: السعر على مستوى الخيارات داخل المجموعة
      if (addonGroup.options?.length > 0) {
        addonGroup.options.forEach((option) => {
          // فقط الخيارات المختارة فعلياً
          const isSelected = 
            option.selected === true || 
            (Number(option.quantity) > 0);

          if (isSelected) {
            const price = Number(
              option.price_after_discount ?? 
              option.price ?? 
              0
            );
            
            const qty = Number(option.quantity || 1);
            
            extras += price * qty;
          }
        });
      }

      // ج. حالة نادرة: سعر ثابت للمجموعة + كمية (مثل: عدد أطباق إضافية)
      else if (addonGroup.quantity > 0 && addonGroup.price > 0) {
        extras += Number(addonGroup.price) * Number(addonGroup.quantity);
      }
    });
  }

  const finalUnitPrice = basePrice + extras;
  return Number(finalUnitPrice.toFixed(2));
};