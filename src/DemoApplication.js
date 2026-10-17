const MovieController = require("./MovieController");
const MovieService = require("./MovieService");

class DemoApplication {
    static async main(embeddingModel) {
        const jsonMapper = JSON;
        const movieService = new MovieService(embeddingModel, jsonMapper);
        await movieService.initializeMovies();
        return new MovieController(movieService);
    }
}

module.exports = DemoApplication;
