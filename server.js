const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cors = require("cors");
const knex = require("knex");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

let db = knex({
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  },
});

//console.log(db.select('*').from('users'));

const app = express();
app.use(bodyParser.json());
app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/signin", (req, res) => {
  db.select("*")
    .from("users")
    .where("name", "=", req.body.name)
    .then((user) => {
      if (user.length) {
        if (bcrypt.compareSync(req.body.password, user[0].password)) {
          return res.json(user[0]);
        } else {
          return res.json("Wrong password");
        }
      } else return res.json('User not found');
    })
    .catch((err) => {
      found = true;
      return res.json(err);
    });
});

app.post("/register", (req, res) => {
  const { name, password } = req.body;
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  if (password.length === 0) return res.json("invalid password");
  db("users")
    .returning("*")
    .insert({
      name: name,
      password: hash,
      joined: new Date(),
    })
    .then((user) => {
      res.json(user[0]);
    })
    .catch((err) => res.status(400).json(err.detail));
});


app.get("/", (req, res) => {
  res.send("its working");
});

app.post("/solved", (req, res) => {
  const { userId } = req.body;
  db.select("*")
    .from("solvedlogos")
    .where("user_id", "=", userId)
    .then((logos) => {
      res.json(logos);
    })
    .catch((err) => res.json(err));
});

app.put("/update", (req, res) => {
  const { userId, logoId, hintIsOpen, logoIsSolved, points } = req.body;

  const updatedValues = {
    user_id: userId,
    logoid: logoId,
    hintisopen: hintIsOpen,
    logoissolved: logoIsSolved,
  };

  db.select("*")
    .from("solvedlogos")
    .where("user_id", "=", userId)
    .andWhere("logoid", "=", logoId)
    .then((logo) => {
      if (logo.length > 0) {
        db("solvedlogos")
          .where("user_id", "=", userId)
          .andWhere("logoid", "=", logoId)
          .update(updatedValues)
          .then(() => {
            res.json("done");
          })
          .catch((err) => {
            console.error("Error updating row:", err);
            res.status(500).json("Internal error");
          });
      } else {
        db("solvedlogos")
          .insert(updatedValues)
          .then(() => {
            res.json("inserted");
          })
          .catch((err) => {
            console.error("Error inserting row:", err);
            res.status(500).json("Internal error");
          });
      }
    })
    .catch((err) => {
      console.error("Error connecting to the database:", err);
      res.status(500).json("Internal error");
    });

  db("users")
    .where("id", userId)
    .update({ points: points })
    .catch((err) => {
      console.error("Error al actualizar los puntos:", err);
      res.status(500).json("Error interno del servidor");
    });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`app its running on port ${process.env.PORT}`);
});

/*
/ --> this is working
/signin --> POST = succes/fail
/register --> POST = user
/prifile/:id --> GET = user
/update --> PUT --> user (cada vez que se resuelve un logo o se abre una pista)
*/
