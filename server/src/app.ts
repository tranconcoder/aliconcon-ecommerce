import express from 'express';
import passport from 'passport';

// Libs
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';

// Services
import HandleErrorService from './api/services/handleError.service.js';
import ScheduledService from './api/services/scheduled.service.js';

// Database
import MongoDB from './app/db.app.js';

// Configs
import { API_VERSION } from './configs/server.config.js';
import './configs/passport.config.js';

// Routes
import rootRoute from './api/routes/index.js';
import { NotFoundErrorResponse } from './api/response/error.response.js';

const app = express();

/* ------------------------------------------------------ */
/*                        App config                      */
/* ------------------------------------------------------ */
app.set('trust proxy', true);

/* ------------------------------------------------------ */
/*                  Express middlewares                   */
/* ------------------------------------------------------ */

// Body parser
app.use(express.json());
app.use(express.raw());
app.use(express.text());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------ */
/*                      Middlewares                       */
/* ------------------------------------------------------ */
//Compression
app.use(compression())

// Morgan
app.use(morgan('dev'));

// Helmet for security
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' },
        crossOriginEmbedderPolicy: false
    })
);

// CORS
app.use(
    cors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
        exposedHeaders: ['Content-Disposition']
    })
);

// Init passport
app.use(passport.initialize());

/* ------------------------------------------------------ */
/*                        Database                        */
/* ------------------------------------------------------ */
await MongoDB.getInstance().connect();

// Start service
ScheduledService.startScheduledService();

/* ---------------------------------------------------------- */
/*                           Routes                           */
/* ---------------------------------------------------------- */
// Append newest API version if not found
app.use([`/${API_VERSION}/api`, '/'], rootRoute);

// Handle 404 route
app.use((_, __, next) => {
    next(new NotFoundErrorResponse({ message: 'Route is not exists' }));
});

// Error handler
app.use(HandleErrorService.middleware);

export default app;
