#[macro_use]
extern crate rocket;

use chrono::{DateTime, Utc};
use reqwest::Client;
use rocket::http::{Header, Status};
use rocket::response::Responder;
use rocket::{get, response::Response, Request};
use serde::Deserialize;
use std::io::Cursor;

#[derive(Deserialize)]
struct GitHubRelease {
    draft: bool,
    prerelease: bool,
    published_at: DateTime<Utc>,
    assets: Vec<GitHubAsset>,
}

#[derive(Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
}

#[derive(Debug)]
enum CorsResponse {
    Json {
        status: Status,
        body: String,
    },
    PlainText {
        status: Status,
        message: String,
    },
    Binary {
        status: Status,
        content_type: String,
        body: Vec<u8>,
    },
}

impl<'r> Responder<'r, 'static> for CorsResponse {
    fn respond_to(self, _: &'r Request<'_>) -> rocket::response::Result<'static> {
        let mut response = Response::build();
        response
            .header(Header::new("Access-Control-Allow-Origin", "*"))
            .header(Header::new("Access-Control-Allow-Methods", "GET, OPTIONS"))
            .header(Header::new("Access-Control-Allow-Headers", "Content-Type"));

        match self {
            CorsResponse::Json { status, body } => {
                response
                    .status(status)
                    .header(Header::new("Content-Type", "application/json"))
                    .sized_body(body.len(), Cursor::new(body));
            }
            CorsResponse::PlainText { status, message } => {
                response
                    .status(status)
                    .header(Header::new("Content-Type", "text/plain"))
                    .sized_body(message.len(), Cursor::new(message));
            }
            CorsResponse::Binary {
                status,
                content_type,
                body,
            } => {
                response
                    .status(status)
                    .header(Header::new("Content-Type", content_type))
                    .sized_body(body.len(), Cursor::new(body));
            }
        }

        response.ok()
    }
}

#[get("/latest")]
async fn latest_default() -> CorsResponse {
    latest(Some("")).await
}

#[get("/latest/<release_type>")]
async fn latest(release_type: Option<&str>) -> CorsResponse {
    let client = Client::new();
    let url = "https://api.github.com/repos/Waradu/a.ni.me/releases";

    let response = match client.get(url).header("User-Agent", "a.ni.me-api").send().await {
        Ok(resp) => resp,
        Err(_) => {
            return CorsResponse::PlainText {
                status: Status::InternalServerError,
                message: "Error fetching releases".to_string(),
            }
        }
    };

    let data = match response.json::<Vec<GitHubRelease>>().await {
        Ok(data) => data,
        Err(e) => {
            return CorsResponse::PlainText {
                status: Status::InternalServerError,
                message: format!("Error parsing releases {:#?}", e).to_string(),
            }
        }
    };

    let mut releases: Vec<GitHubRelease> = data.into_iter().filter(|r| !r.draft).collect();

    let release_type = release_type.unwrap_or("");
    if release_type != "pre" {
        releases = releases.into_iter().filter(|r| !r.prerelease).collect();
    }

    releases.sort_by(|a, b| b.published_at.cmp(&a.published_at));

    let latest_release = match releases.into_iter().next() {
        Some(release) => release,
        None => {
            return CorsResponse::PlainText {
                status: Status::NotFound,
                message: "No releases found".to_string(),
            }
        }
    };

    let latest_json_asset = match latest_release
        .assets
        .into_iter()
        .find(|asset| asset.name == "latest.json")
    {
        Some(asset) => asset,
        None => {
            return CorsResponse::PlainText {
                status: Status::NotFound,
                message: "latest.json not found".to_string(),
            }
        }
    };

    let latest_json_url = latest_json_asset.browser_download_url;

    let latest_json_response = match client
        .get(&latest_json_url)
        .header("User-Agent", "a.ni.me-api")
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(_) => {
            return CorsResponse::PlainText {
                status: Status::InternalServerError,
                message: "Error fetching latest.json".to_string(),
            }
        }
    };

    let latest_json_text = match latest_json_response.text().await {
        Ok(text) => text,
        Err(_) => {
            return CorsResponse::PlainText {
                status: Status::InternalServerError,
                message: "Error reading latest.json".to_string(),
            }
        }
    };

    CorsResponse::Json {
        status: Status::Ok,
        body: latest_json_text,
    }
}

#[get("/image?<url>")]
async fn image_handler(url: Option<&str>) -> CorsResponse {
    let anime_url = match url {
        Some(u) => u,
        None => {
            return CorsResponse::PlainText {
                status: Status::BadRequest,
                message: "Missing 'url' query parameter".to_string(),
            };
        }
    };

    if anime_url.starts_with("https://cdn.myanimelist.net/images/anime/") {
        let client = Client::new();
        let response = match client.get(anime_url).send().await {
            Ok(resp) => resp,
            Err(_) => {
                return CorsResponse::PlainText {
                    status: Status::InternalServerError,
                    message: "Failed to fetch image".to_string(),
                };
            }
        };

        let content_type = response
            .headers()
            .get("Content-Type")
            .and_then(|v| v.to_str().ok().map(|s| s.to_owned()))
            .unwrap_or_else(|| "image/jpeg".to_string());

        let image_bytes = match response.bytes().await {
            Ok(bytes) => bytes,
            Err(_) => {
                return CorsResponse::PlainText {
                    status: Status::InternalServerError,
                    message: "Failed to read image data".to_string(),
                };
            }
        };

        CorsResponse::Binary {
            status: Status::Ok,
            content_type: content_type.to_string(),
            body: image_bytes.to_vec(),
        }
    } else {
        CorsResponse::PlainText {
            status: Status::BadRequest,
            message: "Invalid URL".to_string(),
        }
    }
}

#[catch(default)]
fn default(status: Status, _request: &Request) -> String {
    format!("Error {}", status.code)
}

#[launch]
fn rocket() -> _ {
    let port = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8000);

    rocket::build()
        .configure(rocket::Config {
            address: "0.0.0.0".parse().unwrap(),
            port,
            ..Default::default()
        })
        .mount("/api", routes![latest_default, latest, image_handler])
        .register("/", catchers![default])
}
