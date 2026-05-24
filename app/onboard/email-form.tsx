"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/db/browser";
import { Button } from "@/components/ui/button";

export function EmailForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email) return;
    setSending(true);

    const supabase = supabaseBrowser();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/onboard` },
    });
    setSending(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    router.push("/onboard?sent=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label
        htmlFor="email"
        className="block kicker"
      >
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@somewhere.dev"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="ledger w-full bg-transparent border-0 border-b border-[color:var(--ink)] dark:border-[color:var(--ivory)] focus:outline-none focus:border-[color:var(--oxblood)] py-2.5 text-lg text-[color:var(--ink)] dark:text-[color:var(--ivory)] placeholder:text-[color:var(--taupe)]"
        style={{ borderRadius: 0 }}
      />
      <Button
        type="submit"
        disabled={sending}
        size="lg"
        className="w-full"
        style={{ borderRadius: "3px" }}
      >
        {sending ? "Sending magic link…" : "Send magic link →"}
      </Button>
    </form>
  );
}
