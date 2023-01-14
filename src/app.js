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
  const { query } = req;
  const { limit } = req.query;
  const messages = await db.collection("messages").find().toArray();
  let userMsgs = messages.filter(
    (msg) =>
      msg.user === user ||
      msg.to === "Todos" ||
      msg.from === user ||
      msg.to === user ||
      msg.type === "status"
  );

  try {
    if (query && limit && isNaN(Number(limit) || Number(limit) < 1)) {
      return res.status(422).send("Query inválido");
    }
    if (limit) {
      return res.status(201).send(userMsgs.slice(-limit));
    }
    return res.status(201).send(userMsgs.reverse());
  } catch (err) {
    console.log(err);
  }
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const user = req.headers.User;
  const date = dayjs(Date.now()).format("hh:mm:ss");

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
    res.status(201).send("Mensagem válida")
  } catch {
    res.status(422).send("Mensagem inválida");
  }
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const date = dayjs().format("hh:mm:ss");
  const lastStatus = Date.now();

  const userSchema = Joi.object({
    name: Joi.string().required(),
  });
  const validUser = userSchema.validate({ name }, { abortEarly: false });
  if (validUser.error) return res.status(422).send("Participante inválido");

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
  } catch (err) {
    console.log(err);
    res.status(422).send("Participante não registrado");
  }
  res.status(201).send("Participante registrado");
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log("Servidor aberto!");
});
