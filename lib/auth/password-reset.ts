export function getPasswordResetErrorKey(code: string | undefined) {
  if (code === "over_email_send_rate_limit") return "email-rate-limit";
  if (code === "email_address_not_authorized") return "email-not-authorized";
  return "email-send";
}
