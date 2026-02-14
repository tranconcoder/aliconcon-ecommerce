// Load env
import './src/api/helpers/loadEnv.helper';
import jsonfile from 'jsonfile';

// Configs
import { HOST, PORT, BASE_URL, NODE_ENV } from './src/configs/server.config.js';

// App
import app from './src/app.js';
import loggerService from './src/api/services/logger.service.js';
import MongoDB from './src/app/db.app.js';
import { provinceModel, districtModel, wardModel } from './src/api/models/location.model.js';
import path from 'path';
import RBACService from '@/services/rbac.service.js';
import mediaService from '@/services/media.service.js';
import categoryService from '@/services/category.service.js';

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

/* ---------------------------------------------------------- */
/*                        Initial data                        */
/* ---------------------------------------------------------- */
const isInit = true;

await RBACService.getInstance().initRBAC();
await mediaService.initMedia();
await categoryService.initCategory();

if (isInit) {
    const provinceJsonFile = path.join(import.meta.dirname, './src/api/assets/provinces.json');
    const districtsJsonFile = path.join(import.meta.dirname, './src/api/assets/districts.json');
    const wardJsonFile = path.join(import.meta.dirname, './src/api/assets/wards.json');

    jsonfile.readFile(provinceJsonFile, (err, data) => {
        if (err) {
            return console.error(err);
        }

        Promise.all(
            data.map(async (item: any) => {
                return provinceModel.create(item);
            })
        ).catch(() => { });
    });

    jsonfile.readFile(districtsJsonFile, (err, data) => {
        if (err) {
            return console.error(err);
        }

        Promise.all(
            data.map(async (item: any) => {
                return districtModel.create(item);
            })
        ).catch(() => { });
    });

    jsonfile.readFile(wardJsonFile, (err, data) => {
        if (err) {
            return console.error(err);
        }

        Promise.all(
            data.map(async (item: any) => {
                return wardModel.create(item);
            })
        ).catch((err) => { });
    });
}
