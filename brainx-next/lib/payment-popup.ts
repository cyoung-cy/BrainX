"use client";

import { PAYMENT_RESULT_MESSAGE_TYPE } from "@/lib/commerce-api";

export function isPaymentPopup() {
  return typeof window !== "undefined" && !!window.opener && window.opener !== window;
}

export function notifyOpenerAndClosePayment(success: boolean, message?: string) {
  if (!isPaymentPopup()) return false;
  window.opener.postMessage({ type: PAYMENT_RESULT_MESSAGE_TYPE, success, message }, window.location.origin);
  window.close();
  return true;
}
