import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const PRIVACY_POLICY = `
Privacy Policy
Last updated: May 11, 2025

This Privacy Policy describes Our policies and procedures on the collection, use
and disclosure of Your information when You use the Service and tells You about
Your privacy rights and how the law protects You.

Application refers to Food2go
Country refers to: Egypt

Personal Data may include:
- Email address
- First name and last name
- Phone number
- Address

We may collect location information with your permission.
You can enable or disable access through your device settings.

Security of Your Personal Data
We strive to protect Your Personal Data but cannot guarantee absolute security.
`;

const Policy = () => {
  const { t } = useTranslation();
  const [policy, setPolicy] = useState(PRIVACY_POLICY);

  return (
    <section className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("Privacy Policy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>{t("Policy Text")}</Label>
          <Textarea
            value={policy}
            onChange={(e) => setPolicy(e.target.value)}
            rows={16}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </section>
  );
};

export default Policy;
