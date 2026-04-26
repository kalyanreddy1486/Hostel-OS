"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPublicTicket } from "@/app/actions/public-ticket";

export function PublicTicketForm({ tenantId }: { tenantId?: string }) {
  const [pending, start] = React.useTransition();
  const [done, setDone] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await submitPublicTicket(fd);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Complaint submitted
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Admin will pick this up from their maintenance queue.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setDone(false)}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {tenantId ? <input type="hidden" name="tenant_id" value={tenantId} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Your name *</Label>
          <Input id="name" name="name" required placeholder="Rahul Kumar" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="room_label">Room no. *</Label>
          <Input
            id="room_label"
            name="room_label"
            required
            placeholder="e.g. 101 or 201-3"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          placeholder="For follow-up, if admin needs to reach you"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Issue *</Label>
        <Input
          id="title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          placeholder="e.g. Leaking tap in bathroom"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Details (optional)</Label>
        <textarea
          id="description"
          name="description"
          maxLength={2000}
          rows={4}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="When did it start? Anything else admin should know?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="priority">How urgent?</Label>
        <select
          id="priority"
          name="priority"
          defaultValue="medium"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="low">Low — can wait a few days</option>
          <option value="medium">Medium — please fix this week</option>
          <option value="high">High — needs attention today</option>
        </select>
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit complaint"}
      </Button>
    </form>
  );
}
