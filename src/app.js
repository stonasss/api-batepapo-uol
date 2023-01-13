import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config()

const PORT = 5000;
const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db("batepapo-uol");
    console.log("Conectado ao mongodb!");
  })
  .catch(() => {
    console.log("Erro na conexão");
  });

const server = express();
server.use(express.json());
server.use(cors());

server.get("/participants", (req, res) => {
  const participants = db
    .collection("participants")
    .find()
    .toArray()
    .then((dados) => {
      return res.send(dados);
    })
    .catch(() => {
      res.status(500).send("Problema no servidor de banco de dados");
    });
});

/*server.post("/participants", (req, res) => ) */

server.listen(PORT, () => {
  console.log("Servidor aberto!");
});
