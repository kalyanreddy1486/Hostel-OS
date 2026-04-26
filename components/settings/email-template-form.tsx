"use client";

import * as React from "react";
import { toast } from "sonner";
import { RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveEmailTemplate } from "@/app/actions/settings";
import {
  DEFAULT_EMAIL_TEMPLATE,
  EMAIL_PLACEHOLDERS,
  applyEmailTemplate,
  plainTextToEmailHtml,
} from "@/lib/email-template";
import { cn } from "@/lib/utils";

const SAMPLE = {
  name: "Aravind",
  amount: "₹8,000",
  month: "April 2026",
  due_date: "24 Apr 2026",
  invoice: "INV-20260424-504",
  upi_vpa: "9876543210@okhdfcbank",
  claim_link: "https://yourhostel.app/pay/abc123",
  report_link: "https://yourhostel.app/report-issue",
};

export function EmailTemplateForm({
  initialTemplate,
}: {
  initialTemplate: string;
}) {
  const [value, setValue] = React.useState(
    initialTemplate || DEFAULT_EMAIL_TEMPLATE,
  );
  const [pending, start] = React.useTransition();
  const taRef = React.useRef<HTMLTextAreaElement | null>(null);

  const usingDefault =
    !initialTemplate || initialTemplate.trim() === DEFAULT_EMAIL_TEMPLATE;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await saveEmailTemplate(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Email template saved.");
    });
  }

  function insertToken(token: string) {
    const ta = taRef.current;
    if (!ta) {
      setValue((v) => v + token);
      return;
    }
    const start = ta.selectionStart ?? value.length;
    const end = ta.selectionEnd ?? value.length;
    const next = value.slice(0, start) + token + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + token.length;
    });
  }

  function resetToDefault() {
    setValue(DEFAULT_EMAIL_TEMPLATE);
  }

  // Live preview shows what the recipient will see — render as HTML so
  // the autolinking and UPI styling are visible during editing.
  const previewText = applyEmailTemplate(value, SAMPLE);
  const previewHtml = plainTextToEmailHtml(previewText);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="email_template" className="text-sm">
            Email body
          </Label>
          {!usingDefault ? (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              Custom
            </span>
          ) : (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              Default
            </span>
          )}
        </div>
        <textarea
          id="email_template"
          name="email_template"
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={14}
          className="w-full rounded-md border border-input bg-background p-3 font-mono text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="Type your email body and use {placeholders} for dynamic values"
        />
        <p className="text-xs text-muted-foreground">
          Click any placeholder below to insert it at the cursor. URLs are
          auto-linked, and UPI IDs are auto-styled in monospace.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-widest text-muted-foreground">
          Available placeholders
        </Label>
        <div className="flex flex-wrap gap-2">
          {EMAIL_PLACEHOLDERS.map((p) => (
            <button
              key={p.token}
              type="button"
              onClick={() => insertToken(p.token)}
              className="group inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-amber-400 hover:bg-amber-50"
              title={`${p.description} — e.g. ${p.example}`}
            >
              <code className="font-mono text-amber-700 group-hover:text-amber-900">
                {p.token}
              </code>
              <span className="text-muted-foreground group-hover:text-foreground">
                {p.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <Eye className="size-3.5 text-muted-foreground" />
          <Label className="text-xs uppercase tracking-widest text-muted-foreground">
            Live preview (sample data, as it will look in the email)
          </Label>
        </div>
        <div
          className="rounded-md border bg-background p-4 text-sm text-foreground"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save template"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={resetToDefault}
          className={cn(value === DEFAULT_EMAIL_TEMPLATE && "opacity-50")}
        >
          <RotateCcw className="mr-1.5 size-3.5" />
          Reset to default
        </Button>
        <p className="ml-auto text-xs text-muted-foreground">
          Saving an empty body = use the built-in default.
        </p>
      </div>
    </form>
  );
}
