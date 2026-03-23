export const calculateItemUnitPrice = (item) => {
  // السعر الأساسي الابتدائي
  let currentBasePrice = Number(item.price_after_discount ?? item.price ?? 0);

  let extras = 0;

  // 1. Variations (الاختيار الإجباري أو الاختياري من المجموعات)
  if (item.selectedVariation && item.variations?.length > 0) {
    Object.entries(item.selectedVariation).forEach(([groupId, optionId]) => {
      const group = item.variations.find((g) => String(g.id) === String(groupId));
      if (!group) return;

      const option = group.options?.find((o) => String(o.id) === String(optionId));

      if (option) {
        // هنا التعديل: هنجمع سعر الـ variation كإضافة بدل ما نخليه يمسح السعر الأساسي
        const optionPrice = Number(
          option.price_after_discount ??
          option.price ??
          option.total_option_price ??
          0
        );
        extras += optionPrice;
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
      if (addonGroup.price > 0 && addonGroup.selected === true) {
        extras += Number(addonGroup.price);
      }
      if (addonGroup.options?.length > 0) {
        addonGroup.options.forEach((option) => {
          const isSelected =
            option.selected === true ||
            (Number(option.quantity) > 0);
          if (isSelected) {
            const price = Number(option.price_after_discount ?? option.price ?? 0);
            const qty = Number(option.quantity || 1);
            extras += price * qty;
          }
        });
      }
      else if (addonGroup.quantity > 0 && addonGroup.price > 0) {
        extras += Number(addonGroup.price) * Number(addonGroup.quantity);
      }
    });
  }

  const finalUnitPrice = currentBasePrice + extras;
  return Number(finalUnitPrice.toFixed(2));
};