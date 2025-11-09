 // src/services/productProcessor.js
export const buildProductPayload = (item) => {
  // 1. تجميع الـ Variations
  const groupedVariations = item.allSelectedVariations?.reduce((acc, variation) => {
    const existing = acc.find(v => v.variation_id === variation.variation_id);
    if (existing) {
      existing.option_id = Array.isArray(existing.option_id)
        ? [...existing.option_id, variation.option_id.toString()]
        : [existing.option_id.toString(), variation.option_id.toString()];
    } else {
      acc.push({
        variation_id: variation.variation_id.toString(),
        option_id: [variation.option_id.toString()],
      });
    }
    return acc;
  }, []) || [];

  // 2. فصل Extras عن Addons
  const realExtrasIds = [];
  const addonItems = [];

  if (item.selectedExtras?.length > 0) {
    item.selectedExtras.forEach(id => {
      const isRealExtra = item.allExtras?.some(extra => extra.id === id);
      if (isRealExtra) {
        realExtrasIds.push(id.toString());
      } else {
        const addon = item.addons?.find(a => a.id === id);
        if (addon) {
          const existingAddon = addonItems.find(a => a.addon_id === id.toString());
          if (existingAddon) {
            existingAddon.count = (parseInt(existingAddon.count) + 1).toString();
          } else {
            addonItems.push({
              addon_id: id.toString(),
              count: "1",
            });
          }
        }
      }
    });
  }

  // 3. إضافة selectedAddons (إذا كانت موجودة بشكل منفصل)
  if (item.selectedAddons?.length > 0) {
    item.selectedAddons.forEach(addonData => {
      const existing = addonItems.find(a => a.addon_id === addonData.addon_id.toString());
      if (existing) {
        existing.count = (parseInt(existing.count) + (addonData.count || 1)).toString();
      } else {
        addonItems.push({
          addon_id: addonData.addon_id.toString(),
          count: (addonData.count || 1).toString(),
        });
      }
    });
  }

  // 4. بناء الـ Payload النهائي
  return {
    product_id: item.id.toString(),
    count: (item.count || 1).toString(),
    note: (item.notes || "").trim() || "No special instructions",
    addons: addonItems,
    variation: groupedVariations,
    exclude_id: (item.selectedExcludes || []).map(id => id.toString()),
    extra_id: realExtrasIds,
  };
};