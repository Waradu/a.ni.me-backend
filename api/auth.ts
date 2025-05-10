export async function GET(request: Request) {
  const client_id = process.env.CLIENT_ID;
  const redirect_uri = process.env.REDIRECT_URI;

  const location = `https://anilist.co/api/v2/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}&response_type=code`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
    },
  });
}
