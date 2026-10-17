const http = require("http");
const fs = require("fs");
const path = require("path");

const DemoApplication = require("./DemoApplication");
const GeminiEmbeddingModel = require("./model/GeminiEmbeddingModel");

const PUBLIC_DIR = path.join(__dirname, "public");

const CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".ico": "image/x-icon"
};

function sendJson(response, statusCode, payload) {
    const body = JSON.stringify(payload);
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": Buffer.byteLength(body)
    });
    response.end(body);
}

function serveStatic(response, pathname) {
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(PUBLIC_DIR, relative);

    // Never serve anything outside the public folder.
    if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
        sendJson(response, 403, { error: "Forbidden" });
        return;
    }

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === "ENOENT" || error.code === "EISDIR") {
                response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                response.end("Not found");
                return;
            }
            response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Internal server error");
            return;
        }

        response.writeHead(200, {
            "Content-Type": CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
            "Content-Length": content.length
        });
        response.end(content);
    });
}

async function handleMovies(movieController, response, url, segments) {
    // /movies/search?query=...
    if (segments[1] === "search") {
        const query = url.searchParams.get("query");

        if (!query || query.trim() === "") {
            sendJson(response, 400, { error: "The 'query' parameter is required." });
            return;
        }

        const matches = await movieController.search(query.trim());
        sendJson(response, 200, serializeMatches(matches));
        return;
    }

    // /movies/{title}/similar
    if (segments.length === 3 && segments[2] === "similar") {
        const title = decodeURIComponent(segments[1]);
        const matches = movieController.similarMovies(title);
        sendJson(response, 200, serializeMatches(matches));
        return;
    }

    sendJson(response, 404, { error: "Unknown endpoint." });
}

// MovieMatch keeps the same JSON shape as the Spring Boot controller:
// { "title": ..., "description": ..., "match": <cosine similarity> }
function serializeMatches(matches) {
    return matches.map(match => ({
        title: match.getTitle(),
        description: match.getDescription(),
        match: match.getMatch()
    }));
}

function createRequestHandler(movieController) {
    return async function requestHandler(request, response) {
        const url = new URL(request.url, "http://" + (request.headers.host || "localhost"));
        const segments = url.pathname.split("/").filter(segment => segment !== "");

        if (request.method !== "GET") {
            sendJson(response, 405, { error: "Only GET is supported." });
            return;
        }

        if (segments[0] === "movies") {
            try {
                await handleMovies(movieController, response, url, segments);
            } catch (error) {
                if (error.message.startsWith("Movie not found:")) {
                    sendJson(response, 404, { error: error.message });
                    return;
                }
                console.error(error);
                sendJson(response, 500, { error: error.message });
            }
            return;
        }

        serveStatic(response, url.pathname);
    };
}

async function main() {
    const envFile = path.join(__dirname, ".env");

    if (fs.existsSync(envFile)) {
        process.loadEnvFile(envFile);
    }

    const embeddingModel = new GeminiEmbeddingModel({
        apiKey: process.env.Gemini_API_KEY,
        model: process.env.GEMINI_EMBEDDING_MODEL,
        cacheFile: process.env.EMBEDDING_CACHE_FILE ||
            path.join(__dirname, "resources/movie-embeddings.json")
    });

    const port = Number(process.env.PORT || 8080);

    const movieController = await DemoApplication.main(embeddingModel);

    const server = http.createServer(createRequestHandler(movieController));

    server.listen(port, () => {
        console.log("MovieMatch is running at http://localhost:" + port);
    });
}

main().catch(error => {
    console.error(error.message);
    process.exit(1);
});