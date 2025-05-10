import axios from "axios";

export async function GET(request: Request) {
  const client_id = process.env.CLIENT_ID;
  const client_secret = process.env.CLIENT_SECRET;

  const req = new URL(request.url);
  const code = req.searchParams.get("code");
  const redirect_uri = process.env.REDIRECT_URI;

  try {
    const response = await axios.post<{ access_token: string }>(
      "https://anilist.co/api/v2/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: client_id,
        client_secret: client_secret,
        redirect_uri: redirect_uri,
        code: code,
      }
    );

    const token = response.data.access_token;

    return new Response(null, {
      status: 302,
      headers: {
        Location: `a.ni.me://callback#${token}`,
      },
    });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ message: "Couldn't exchange code for token" }),
      { status: 502 }
    );
  }
}
