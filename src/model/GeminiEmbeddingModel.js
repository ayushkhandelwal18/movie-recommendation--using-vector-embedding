const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

const DEFAULT_MODEL = "gemini-embedding-001";
const PROVIDER = "gemini";

/**
 * Node.js equivalent of the embedding model that the Spring Boot demo got from
 * Spring AI. Backed by the Google Gemini Embeddings API through the official
 * @google/genai SDK.
 *
 * embed(text) resolves to an Array of numbers, matching the float[] that
 * EmbeddingModel.embed() returns in the Spring version.
 *
 * Embeddings are cached: an in-memory Map serves repeat calls inside one
 * process, and an optional JSON file on disk survives restarts so the movie
 * vectors are not regenerated on every boot. The cache is stamped with the
 * provider and model name, so vectors left over from a different provider
 * (for example OpenAI's 1536-dimension ones) are discarded instead of being
 * silently compared against Gemini vectors.
 */
class GeminiEmbeddingModel {
    constructor(options = {}) {
        this.apiKey = options.apiKey || process.env.Gemini_API_KEY;
        this.model = options.model || DEFAULT_MODEL;
        this.cacheFile = options.cacheFile || null;

        if (!this.apiKey) {
            throw new Error(
                "Gemini_API_KEY is not set. Add it to your .env file before starting the application."
            );
        }

        this.ai = new GoogleGenAI({ apiKey: this.apiKey });

        this.cache = new Map();
        this.inFlight = new Map();
        this.dimensions = null;

        this.loadCache();
    }

    cacheKey(text) {
        return JSON.stringify([this.model, text]);
    }

    loadCache() {
        if (!this.cacheFile || !fs.existsSync(this.cacheFile)) {
            return;
        }

        try {
            const stored = JSON.parse(fs.readFileSync(this.cacheFile, "utf8"));

            if (stored.provider !== PROVIDER || stored.model !== this.model) {
                console.log(
                    "Ignoring the existing embedding cache: it was built with '" +
                        (stored.provider || "unknown") +
                        "/" +
                        (stored.model || "unknown") +
                        "' but this app uses '" +
                        PROVIDER +
                        "/" +
                        this.model +
                        "'. Regenerating every movie embedding."
                );
                return;
            }

            this.cache = new Map(Object.entries(stored.entries || {}));
            this.dimensions = stored.dimensions || null;

            console.log(
                this.cache.size +
                    " cached Gemini embeddings loaded from disk (" +
                    (this.dimensions || "unknown") +
                    " dimensions)."
            );
        } catch (error) {
            console.warn("Could not read the embedding cache: " + error.message);
        }
    }

    saveCache() {
        if (!this.cacheFile) {
            return;
        }

        const entries = {};
        for (const [key, vector] of this.cache.entries()) {
            entries[key] = vector;
        }

        const payload = JSON.stringify({
            provider: PROVIDER,
            model: this.model,
            dimensions: this.dimensions,
            entries: entries
        });

        try {
            fs.mkdirSync(path.dirname(this.cacheFile), { recursive: true });
            fs.writeFileSync(this.cacheFile, payload, "utf8");
        } catch (error) {
            console.warn("Could not write the embedding cache: " + error.message);
        }
    }

    /**
     * Guards the cosine similarity in MovieService: every vector handed to it
     * has to be a non-empty array of finite numbers, and all of them have to
     * share the same length.
     */
    validateVector(vector) {
        if (!Array.isArray(vector) || vector.length === 0) {
            throw new Error(
                "Gemini returned an empty embedding for '" +
                    (vector === undefined ? "undefined" : typeof vector) +
                    "'."
            );
        }

        for (let i = 0; i < vector.length; i++) {
            if (typeof vector[i] !== "number" || !Number.isFinite(vector[i])) {
                throw new Error(
                    "Gemini returned a non-numeric value at position " +
                        i +
                        " of the embedding vector."
                );
            }
        }

        if (this.dimensions === null) {
            this.dimensions = vector.length;
        } else if (vector.length !== this.dimensions) {
            throw new Error(
                "Embedding dimension mismatch: expected " +
                    this.dimensions +
                    " but received " +
                    vector.length +
                    "." +
                    (this.cacheFile
                        ? " Delete " + this.cacheFile + " and restart to rebuild the cache."
                        : "")
            );
        }

        return vector;
    }

    async embed(text) {
        if (typeof text !== "string" || text.trim() === "") {
            throw new Error("Cannot embed an empty text.");
        }

        const key = this.cacheKey(text);

        const cached = this.cache.get(key);
        if (cached) {
            return this.validateVector(cached);
        }

        // Collapse concurrent requests for the same text into one API call.
        const pending = this.inFlight.get(key);
        if (pending) {
            return pending;
        }

        const request = this.callApi(text)
            .then(vector => {
                this.cache.set(key, vector);
                this.saveCache();
                return vector;
            })
            .finally(() => {
                this.inFlight.delete(key);
            });

        this.inFlight.set(key, request);

        return request;
    }

    async callApi(text) {
        let response;

        try {
            response = await this.ai.models.embedContent({
                model: this.model,
                contents: text
            });
        } catch (error) {
            throw new Error(
                "Gemini embeddings request failed: " +
                    (error && error.message ? error.message : error)
            );
        }

        if (!response || !response.embeddings || response.embeddings.length === 0) {
            throw new Error("Gemini embeddings response contained no vectors.");
        }

        return this.validateVector(response.embeddings[0].values);
    }
}

module.exports = GeminiEmbeddingModel;