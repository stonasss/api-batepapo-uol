import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import Joi from "joi";
dotenv.config();

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;
await mongoClient.connect();
db = mongoClient.db();

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
    return res.status(201).send("Participantes obtidos")
});

server.get("/messages", (req, res) => {
  console.log(req.query);
  const { limit } = req.query;

  const messages = db
    .collection("messages")
    .find()
    .toArray()
    .then((dados) => {
      const recentMsgs = dados.reverse().slice(0, parseInt(limit));
      return res.send(recentMsgs);
    });
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;

  if (type !== "private_message" || type !== "message")
    return res.status(422).send("Tipo de mensagem inválido");
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const date = dayjs().format("hh:mm:ss");
  const lastStatus = Date.now();

  const userSchema = Joi.object({
    name: Joi.string().required()
  })
  const validUser = userSchema.validate({ name })
  if (validUser.error) return res.status(422).send("Participante inválido")

  if (name === "") return res.status(422).send("Preencha o campo vazio");

  try {
    const userExists = await db.collection("participants").findOne({ name });
    if (userExists) return res.status(409).send("Participante já existe");
    await db.collection("participants").insertOne({ name, lastStatus });
    await db.collection("messages").insertOne({
      from: name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: date
    })
  } catch (err) {
    console.log(err);
    res.status(422).send("Participante não registrado");
  }
  res.status(201).send("Participante registrado");
});

const PORT = process.env.PORT;
server.listen(PORT, () => {
  console.log("Servidor aberto!");
});
