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

server.get("/participants", async (req, res) => {
  db.collection("participants")
    .find()
    .toArray()
    .then((data) => {
      return res.send(data);
    })
    .catch(() => {
      res.status(500).send("Problema no servidor de banco de dados");
    });
});

server.get("/messages", async (req, res) => {
  const { user } = req.headers;
  const messages = await db.collection("messages").find().toArray();
  let limit;

  if (req.query.limit) {
    limit = parseInt(req.query.limit);
    if (isNaN(limit) || limit < 1) {
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
});

server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const time = dayjs(Date.now()).format("hh:mm:ss");
  const from = req.headers.user;

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

  if (to === "" || type === "") {
    return res.status(422).send("Preencha os campos vazios");
  } else {
    try {
      const Anon = await db.collection("participants").findOne({ name: from });
      if (!Anon) {
        return res.status(422).send("User inexistente");
      } else {
        await db.collection("messages").insertOne({
          to: to,
          text: text,
          type: type,
          from: from,
          time: time,
        });
        res.status(201).send("Mensagem válida");
      }
    } catch {
      res.status(422).send("Mensagem inválida");
    }
  }
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  let lastStatus = Date.now();
  let userExists;

  const userSchema = Joi.object({ name: Joi.string().required() });
  const validUser = userSchema.validate({ name }, { abortEarly: false });

  if (name === null || validUser.error) {
    return res.status(422).send("Usuário inválido");
  } else {
    try {
      userExists = await db.collection("participants").findOne({ name });
      if (userExists) {
        return res.status(409).send("Participante já existe");
      } else {
        await db.collection("participants").insertOne({ name, lastStatus });
        await db.collection("messages").insertOne({
          from: name,
          to: "Todos",
          text: "entra na sala...",
          type: "status",
          time: date,
        });
      }
      return res.status(201).send("Participante registrado");
    } catch {
      console.log(err);
    }
  }
});

server.post("/status", async (req, res) => {
  const { user } = req.headers;
  const time = Date.now();
  const userExists = await db
    .collection("participants")
    .findOne({ name: user });
  const currentStatus = { name: user, lastStatus: time };

  try {
    if (!userExists) {
      res.status(404).send("Usuário inexistente");
      return;
    }
    await db
      .collection("participants")
      .updateOne({ name: user }, { $set: currentStatus });
    res.status(200).send("Usuário atualizado");
  } catch (err) {
    console.log(err);
  }
});

setInterval(async function removeAway() {
  const updatedTime = Date.now();
  const time = dayjs(Date.now()).format("hh:mm:ss");

  const checkActivity = await db
    .collection("participants")
    .find({ lastStatus: { $lt: updatedTime - 10000 } })
    .toArray();

  checkActivity.forEach(async (user) => {
    await db.collection("messages").insertOne({
      from: user.name,
      to: "Todos",
      text: "sai da sala...",
      type: "status",
      time: time,
    });
    await db.collection("participants").deleteOne({ name: user.name });
  });
}, 15000);

const PORT = 5000;
server.listen(PORT, () => {
  console.log("Servidor aberto!");
});
