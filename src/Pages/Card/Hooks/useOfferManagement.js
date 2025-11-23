import { useState } from "react";
import { toast } from "react-toastify";

export function useOfferManagement(orderItems, updateOrderItems, postData, t) {
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerCode, setOfferCode] = useState("");
  const [pendingOfferApproval, setPendingOfferApproval] = useState(null);

  const handleApplyOffer = async () => {
    if (!offerCode.trim()) {
      toast.warning(t("Pleaseenteranoffercode"));
      return;
    }

    const formData = new FormData();
    formData.append("code", offerCode.trim());

    try {
      const response = await postData("cashier/offer/check_order", formData);
      let offerData = response?.offer || response?.data?.offer;
      if (offerData && !Array.isArray(offerData)) {
        offerData = [offerData];
      }

      const appliedOfferDetails =
        Array.isArray(offerData) && offerData.length > 0 ? offerData[0] : null;

      if (appliedOfferDetails) {
        const offerInfo = appliedOfferDetails.offer;
        const productName = offerInfo?.product || appliedOfferDetails.product;
        const pointsRequired =
          offerInfo?.points || appliedOfferDetails.points || 0;

        if (productName) {
          toast.success(t("OffervalidatedsuccessfullyPleaseconfirm"));
          setPendingOfferApproval({
            offer_order_id: appliedOfferDetails.id,
            user_id: appliedOfferDetails.user_id,
            product: productName,
            points: pointsRequired,
          });
          setShowOfferModal(false);
        } else {
          toast.error(t("Offerdetailsareincompleteintheresponse"));
        }
      } else {
        toast.error(t("Offerdetailsareincompleteintheresponse"));
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        toast.error(
          err.response?.data?.message || t("Failedtofetchdiscountdata")
        );
      } else {
        toast.error(t("FailedtovalidateofferPleasetryagain"));
      }
    }
  };

  const handleApproveOffer = async () => {
    if (!pendingOfferApproval) return;

    const { offer_order_id, user_id, product } = pendingOfferApproval;

    const formData = new FormData();
    formData.append("offer_order_id", offer_order_id.toString());
    formData.append("user_id", user_id.toString());

    try {
      const response = await postData("cashier/offer/approve_offer", formData);
      if (response?.success) {
        toast.success(t("RewardAdded", { product }));
        const freeItem = {
          temp_id: `reward-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          id: offer_order_id,
          name: product + " (Reward Item)",
          price: 0.0,
          count: 1,
          is_reward: true,
          applied_discount: 0,
        };
        updateOrderItems([...orderItems, freeItem]);
        setPendingOfferApproval(null);
        setOfferCode("");
      } else {
        toast.error(response.message || t("Failedtoapproveoffer"));
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.exception ||
        t("Failedtoapproveoffer");
      toast.error(errorMessage);
    }
  };

  return {
    showOfferModal,
    setShowOfferModal,
    offerCode,
    setOfferCode,
    pendingOfferApproval,
    setPendingOfferApproval,
    handleApplyOffer,
    handleApproveOffer,
  };
}