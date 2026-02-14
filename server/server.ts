// Load env
import './src/api/helpers/loadEnv.helper';

// Configs
import { PORT, BASE_URL } from './src/configs/server.config.js';

// App
import app from './src/app.js';
import loggerService from './src/api/services/logger.service.js';
import MongoDB from './src/app/db.app.js';

// Socket.IO
import SocketIOService from '@/services/socketio.service.js';

const server = app.listen(Number(PORT), () => {
    console.log(`Server is running at ${BASE_URL}`);
});

/* ---------------------------------------------------------- */
/*                       Socket.IO Setup                     */
/* ---------------------------------------------------------- */
// Initialize Socket.IO service
SocketIOService.getInstance().initialize(server);

server.on("close", () => {
    // Close database connection
    MongoDB.getInstance().disconnect();

    // Logging
    loggerService.getInstance().info('Server closed');

    process.exit(0);
});

process.on('SIGINT', async () => {
    // Close database connection
    MongoDB.getInstance().disconnect();

    console.log('Server closing...');

    // Close server
    server.close(() => {
        // Close database connection
        MongoDB.getInstance().disconnect();

        // Logging
        loggerService.getInstance().info('Server closed');

        process.exit(0);
    });
});