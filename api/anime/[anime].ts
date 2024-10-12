import axios from "axios";

const kvsApiUrl = "https://kvs.wireway.ch";
const authToken = process.env.AUTH_KEY;
const kvsDbId = process.env.DB_KEY;
const cacheDuration = 86400 * 1000;

async function fetchFromKVS(key: string) {
  try {
    console.log(`retrieving ${key} from kvs`);
    const response = await axios.get(
      `${kvsApiUrl}/database/${kvsDbId}/${key}`,
      {
        headers: {
          Authorization: `${authToken}`,
        },
      }
    );
    console.log(
      `retrieved ${response.data.value ? "" : "no "}data for ${key} from kvs`
    );
    return JSON.parse(response.data.value).value;
  } catch (error) {
    return null;
  }
}

async function storeInKVS(key: string, value: any) {
  const headers = {
    Authorization: authToken,
  };

  value.expiry = Date.now() + cacheDuration;
  value.cached = true;

  try {
    console.log(`storing ${key} in kvs`);
    const response = await axios.post(
      `${kvsApiUrl}/database/${kvsDbId}/${key}?unsafe=true`,
      { value: JSON.stringify({ value }) },
      { headers }
    );
    console.log(`stored ${key} in kvs`);

    return response.data;
  } catch (error) {
    console.error("Error storing data in KVS:", error);
    throw error;
  }
}

async function fetchAnimeDataWithRetry(animeId: string, maxRetries = 10) {
  const apiUrl = `https://api.jikan.moe/v4/anime/${animeId}`;
  let retries = 0;
  while (true) {
    try {
      const { data } = await axios.get(apiUrl);
      return data;
    } catch (error: any) {
      if (error.response && error.response.status === 429) {
        if (retries >= maxRetries) {
          throw new Error("Max retries exceeded");
        }
        retries++;
        console.log(
          `Received 429 Too Many Requests. Retrying in 1 second... (Attempt ${retries}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        throw error;
      }
    }
  }
}

export async function GET(request: Request) {
  const urlParams = new URLSearchParams(new URL(request.url).search);
  const animeId = urlParams.get("anime");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (!animeId) {
    return new Response("Anime ID not provided", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const cachedData = await fetchFromKVS(animeId);
  if (cachedData && Date.now() < cachedData.expiry) {
    return new Response(JSON.stringify(cachedData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const data = await fetchAnimeDataWithRetry(animeId);

    await storeInKVS(animeId, data);

    data.cached = false;

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching anime data:", error);
    return new Response("Error fetching anime data", {
      status: 500,
      headers: corsHeaders,
    });
  }
}
