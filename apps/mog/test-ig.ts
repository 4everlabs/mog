import { Stagehand } from "@browserbasehq/stagehand";

async function main() {
  const stagehand = new Stagehand({
    env: "LOCAL",
    experimental: true,
    verbose: 1
  });
  await stagehand.init();
  const ctx = stagehand.context;
  const page = ctx.activePage() || ctx.pages()[0];
  await ctx.addCookies([
    {
      name: "sessionid",
      value: "57843944213%3AaWIYf1teuMSDxl%3A0%3AAYjCItDpzOqLDQOLPrad-Nszss_TWRUealhKXN7UXVU",
      domain: ".instagram.com",
      path: "/",
      httpOnly: true,
      secure: true,
    },
  ]);
  
  await page.goto("https://instagram.com/leilani1123/", { waitUntil: "domcontentloaded" });
  console.log("Waiting 5 seconds for page load...");
  await new Promise(r => setTimeout(r, 5000));
  
  const links = await page.evaluate(() => {
    const main = document.querySelector("main") || document.body;
    const els = Array.from(main.querySelectorAll('a')).filter(a => {
      const href = a.getAttribute('href') || '';
      return href.includes('/p/') || href.includes('/reel/');
    });
    if (els.length > 0) {
      (els[0] as HTMLElement).click();
    }
    return els.map(a => a.getAttribute('href'));
  });
  console.log("Clicked:", links[0]);
  console.log("Waiting 3s for dialog...");
  await new Promise(r => setTimeout(r, 3000));
  const dialogHtml = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    return dialog ? dialog.innerHTML.substring(0, 100) : "NO DIALOG";
  });
  console.log("Dialog found:", dialogHtml !== "NO DIALOG");
  await stagehand.close();
}
main().catch(console.error);