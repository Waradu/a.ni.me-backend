import axios from "axios";
import type { Router } from "express";

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;
const location = `https://anilist.co/api/v2/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;

export default (router: Router) => {
  router.get("/auth", (req, res) => {
    res.redirect(location);
  });

  router.get("/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) {
      res.status(400).json({
        error: "Anilist did not return a code please try again.",
      });
      return;
    }

    const response = await axios.post<{ access_token: string }>(
      "https://anilist.co/api/v2/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code: code,
      }
    );

    const token = response.data.access_token;

    if (!token) {
      res.status(400).json({
        error: "Anilist did not return a token please try again.",
      });
      return;
    }

    res.redirect(`a.ni.me://callback#${token}`);
  });
};
