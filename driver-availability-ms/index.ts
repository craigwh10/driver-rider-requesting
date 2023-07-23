import express, { Response } from 'express';
import joi from 'joi';
import {createClient} from "redis";
import bodyParser from "body-parser";
import {sendMessage} from "./sqs";

require('dotenv').config();

const app = express();
const redisClient = createClient({
    url: 'redis://redis:6379'
});

redisClient.on('error', err => {
    console.log('Redis Client Error', err);
})

redisClient.connect().then(() => {
    console.log('connected to redis client');
})

app.use(bodyParser.json());

const availableSchema = joi.object({
    driverId: joi.string().required(),
    coords: joi.object({
        x: joi.number(),
        y: joi.number()
    }).required()
}).required()

interface Available {
    driverId: string;
    coords: {
        x: number;
        y: number;
    };
};

app.post('/available', async (req, res) => {
    let body: Available;
    try {
        body = await availableSchema.validateAsync(req.body);
    } catch (err) {
        res.status(400).json({
            message: 'Bad Request'
        })
        return;
    }

    const cachedAvailableDriver = await redisClient.get(body.driverId);

    if (!cachedAvailableDriver) {
        // send message to get driver data in request response
        await redisClient.set(body.driverId, JSON.stringify(body.coords));
        res.setHeader('X-Cache', 'HIT');
    } else {
        res.setHeader('X-Cache', 'MISS');
    }

    sendMessage('ping');

    res.status(200).json({
        message: 'pong'
    })
});

app.listen(8050, () => {
    console.log('listening on port 8050')
});

function handleAppShutdown() {
    redisClient.quit();
}

process.on('SIGINT', handleAppShutdown);
process.on('SIGTERM', handleAppShutdown);