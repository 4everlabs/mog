import index from "./index.html";

console.log("🚀 Starting JSON Render Adaptive Cards Demo...");

Bun.serve({
  port: 3000,
  routes: {
    "/": index,
    "/api/health": () => {
      return Response.json({ 
        status: "ok", 
        service: "json-render-adaptive-cards",
        message: "Adaptive Cards surface ready. Visit http://localhost:3000"
      });
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log("✅ JSON Render Demo running at http://localhost:3000");
console.log("📋 Visit http://localhost:3000 to see the Adaptive Cards demo");
console.log("💡 Powered by @json-render/svelte + Adaptive Cards catalog from https://json-render.dev/docs/adaptive-cards");
console.log("🔄 HMR enabled for frontend.svelte changes");