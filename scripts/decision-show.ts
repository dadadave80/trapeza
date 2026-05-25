/** Print a decision row from Supabase by id. Usage:
 *  bun run scripts/decision-show.ts <decisionId>
 */
import { supabaseService } from "@/lib/db/client";

const id = process.argv[2];
if (!id) { console.error("usage: bun run scripts/decision-show.ts <decisionId>"); process.exit(1); }

const svc = supabaseService();
const { data, error } = await svc.from("decisions").select("*").eq("id", id).maybeSingle();
if (error) { console.error("err:", error.message); process.exit(1); }
console.log(JSON.stringify(data, null, 2));
