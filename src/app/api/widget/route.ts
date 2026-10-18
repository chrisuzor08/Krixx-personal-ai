import { getPublicAgent, DEFAULT_WIDGET } from "@/lib/agents";
import { appUrl } from "@/lib/mail";

export const dynamic = "force-dynamic";

/** Embeddable widget loader: <script src="/api/widget?agent=SLUG" async></script> */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("agent") ?? "";
  const js = (body: string) => new Response(body, { headers: { "content-type": "application/javascript; charset=utf-8", "cache-control": "public, max-age=60" } });
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return js(`console.warn("KRiXX widget: invalid agent");`);
  const full = await getPublicAgent(slug);
  if (!full) return js(`console.warn("KRiXX widget: agent not published");`);
  const w = { ...DEFAULT_WIDGET, ...(full.settings.widget ?? {}) };
  const cfg = JSON.stringify({ src: `${appUrl(req)}/agent/${slug}?embed=1`, color: w.primaryColor, side: w.position, icon: w.launcherIcon, width: w.width, height: w.height, title: w.headerText });
  return js(`(function(){if(window.__krixx)return;window.__krixx=1;var c=${cfg};
var b=document.createElement("button");b.setAttribute("aria-label",c.title);b.textContent=c.icon;
b.style.cssText="position:fixed;bottom:20px;"+c.side+":20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;font-size:24px;color:#fff;z-index:2147483646;box-shadow:0 10px 30px rgba(0,0,0,.3);background:"+c.color;
var f=document.createElement("iframe");f.src=c.src;f.title=c.title;f.allow="microphone; clipboard-write";
f.style.cssText="position:fixed;bottom:88px;"+c.side+":20px;width:min("+c.width+"px,calc(100vw - 40px));height:min("+c.height+"px,calc(100vh - 120px));border:0;border-radius:18px;z-index:2147483647;box-shadow:0 24px 60px rgba(0,0,0,.35);display:none;background:#08090D";
b.onclick=function(){var o=f.style.display==="none";f.style.display=o?"block":"none";b.textContent=o?"✕":c.icon};
document.body.appendChild(f);document.body.appendChild(b);})();`);
}
