import OrderPage from "./OrderPage";

export default function TakeAway({ orderType }) {
  return (
    <OrderPage
      propOrderType={orderType} 
    />
  );
}
