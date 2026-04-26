import { requireAdmin } from "@/lib/require-role";
import { getAppSettings } from "@/lib/settings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { WhatsappTemplateForm } from "@/components/settings/whatsapp-template-form";
import { PasswordChangeForm } from "@/components/settings/password-change-form";
import { PageHeading } from "@/components/ui/page-heading";
import { Lock, MessageCircle, Wallet } from "lucide-react";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getAppSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeading
        eyebrow="Operations"
        title="Settings"
        description="Configure UPI payments, WhatsApp reminder text, and hostel info."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4 text-muted-foreground" />
            UPI payments
          </CardTitle>
          <CardDescription>
            When admin clicks &quot;Send reminder&quot;, residents get a UPI
            deep link pre-filled with this VPA. After they pay, they submit
            the UTR and you confirm it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initial={{
              upi_vpa: settings.upi_vpa,
              upi_payee_name: settings.upi_payee_name,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="size-4 text-muted-foreground" />
            WhatsApp reminder message
          </CardTitle>
          <CardDescription>
            The message that opens in WhatsApp when you click the &quot;Remind&quot;
            button on an unpaid invoice. Use{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
              {"{placeholder}"}
            </code>{" "}
            tokens for dynamic values like resident name, amount, and links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsappTemplateForm initialTemplate={settings.whatsapp_template} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4 text-muted-foreground" />
            Security
          </CardTitle>
          <CardDescription>
            Change the password you use to sign in. We&apos;ll verify your
            current password before saving the new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
