import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb"

const mongoClient = new MongoClient("localhost://127.0.0.1:27017")

mongoClient.connect().then().catch()

const server = express();
server.use(express.json());
server.use(cors())