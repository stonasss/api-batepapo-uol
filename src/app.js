import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db();
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

server.post("/participants", (req, res) => {
  const { name } = req.body;

  db.collection("participants")
    .insertOne({ name })
    .then(() => {
      res.status(201).send("Participante registrado");
    })
    .catch(() => {
      if (name === null) {
        res.status(422).send("Preencha o campo vazio");
      }
      res.status(422).send("Participante não registrado");
    });
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log("Servidor aberto!");
});
