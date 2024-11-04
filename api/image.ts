export async function GET(request: Request) {
  const urlParams = new URLSearchParams(new URL(request.url).search);
  const animeUrl = urlParams.get("url");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (
    animeUrl &&
    animeUrl.startsWith("https://cdn.myanimelist.net/images/anime/")
  ) {
    try {
      const response = await fetch(animeUrl);
      const readableStream = response.body;

      return new Response(readableStream, {
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
        },
      });
    } catch (error) {
      return new Response("Failed to fetch image", {
        status: 500,
        headers: corsHeaders,
      });
    }
  }

  return new Response("Invalid URL", { status: 400, headers: corsHeaders });
}
