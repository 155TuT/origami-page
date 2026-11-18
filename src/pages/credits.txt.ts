import type { APIRoute } from "astro";
import notice from "../../THIRD-PARTY-NOTICES.txt?raw";

export const GET: APIRoute = () => new Response(notice, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
