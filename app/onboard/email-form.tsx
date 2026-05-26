"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabaseBrowser } from "@/lib/db/browser";

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
    <form onSubmit={onSubmit} className="space-y-3">
      <label htmlFor="email" className="block label">
        EMAIL
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@somewhere.dev"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input-brut"
      />
      <button
        type="submit"
        disabled={sending}
        className="btn-acid w-full !text-[12px] !py-3"
      >
        {sending ? "[SENDING…]" : "[SEND MAGIC LINK ↗]"}
      </button>
    </form>
  );
}
