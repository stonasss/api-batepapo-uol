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

const date = dayjs().format("hh:mm:ss");

server.get("/participants", async (_, res) => {
  const participants = await db
    .collection("participants")
    .find()
    .toArray()
    .then((dados) => {
      return res.send(dados);
    })
    .catch(() => {
      res.status(500).send("Problema no servidor de banco de dados");
    });
  return res.status(201).send(participants);
});

server.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const messages = await db.collection("messages").find().toArray();
  let limit;

  try {
    if (req.query.limit) {
      limit = parseInt(req.query.limit);
      if (limit < 1 || isNaN(limit)) {
        return res.status(422).send("Query inválido");
      }
    }
    let userMsgs = messages.filter(
      (msg) =>
        msg.user === user ||
        msg.to === "Todos" ||
        msg.from === user ||
        msg.to === user ||
        msg.type === "status"
    );
    return res.status(200).send(userMsgs.splice(-limit).reverse());
  } catch {
    res.status(422).send("Pedido inválido");
  }
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const user = req.headers.User;

  const msgSchema = Joi.object({
    to: Joi.string().required(),
    text: Joi.string().required(),
    type: Joi.string().valid("private_message", "message").required(),
  });
  const validMsg = msgSchema.validate(
    { to, text, type },
    { abortEarly: false }
  );
  if (validMsg.error) return res.status(422).send(validMsg.error.details);

  if (to === "" || type === "")
    return res.status(422).send("Preencha os campos vazios");

  try {
    const Anon = await db.collection("messages").findOne({ user });
    if (!Anon) return res.status(422).send("User inexistente");
    await db.collection("messages").insertOne({
      from: user,
      to: to,
      text: text,
      type: type,
      time: date,
    });
    res.status(201).send("Mensagem válida");
  } catch {
    res.status(422).send("Mensagem inválida");
  }
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const lastStatus = Date.now();

  const userSchema = Joi.object({
    name: Joi.string().required(),
  });

  const validUser = userSchema.validate({ name }, { abortEarly: false });

  if (validUser.error) return res.status(422).send(validUser.error.details);

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
      time: date,
    });
    return res.status(201).send("Participante registrado");
  } catch {
    console.log(err);
  }
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log("Servidor aberto!");
});
