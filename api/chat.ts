export default async function handler(req: any, res: any) {
  try {
    const serverModule = await import("../server.js");
    const app = serverModule.default;
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Serverless Function Error:", error);
    res.status(500).json({
      error: error?.message || String(error),
      stack: error?.stack,
      source: "vercel_api_chat_wrapper"
    });
  }
}
