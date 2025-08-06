const winston = require('winston');
const path = require('path');

// Define log formats
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Console logging
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // Error log file
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error'
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log')
        }),
        // Arbitrage opportunities log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/arbitrage.log'),
            level: 'info'
        })
    ]
});

// Add specific logging methods for arbitrage events
logger.arbitrage = {
    opportunity: (data) => {
        logger.info('Arbitrage opportunity found', {
            type: 'OPPORTUNITY',
            ...data
        });
    },
    execution: (data) => {
        logger.info('Arbitrage execution', {
            type: 'EXECUTION',
            ...data
        });
    },
    profit: (data) => {
        logger.info('Arbitrage profit calculated', {
            type: 'PROFIT',
            ...data
        });
    },
    error: (error, context = {}) => {
        logger.error('Arbitrage error', {
            type: 'ERROR',
            error: error.message,
            stack: error.stack,
            ...context
        });
    }
};

// Export logger instance
module.exports = logger;