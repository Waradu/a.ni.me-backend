import axios from "axios";

export async function GET(request: Request) {
  const url = "https://api.github.com/repos/Waradu/a.ni.me/releases";

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  try {
    const { data } = await axios.get(url);
    const latestRelease = data
      .filter((release: any) => !release.draft)
      .sort(
        (a: any, b: any) =>
          new Date(b.published_at).getTime() -
          new Date(a.published_at).getTime()
      )[0];

    if (!latestRelease) {
      return new Response("No releases found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const latestJsonUrl = latestRelease.assets.find(
      (asset: any) => asset.name === "latest.json"
    )?.browser_download_url;

    if (!latestJsonUrl) {
      return new Response("latest.json not found", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const latestJson = await axios.get(latestJsonUrl);
    return new Response(JSON.stringify(latestJson.data), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    return new Response("Error fetching release", {
      status: 500,
      headers: corsHeaders,
    });
  }
}
