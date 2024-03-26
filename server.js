const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const cors = require('cors');
const knex = require('knex');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0; 

let db = knex({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
          }
    }
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

const database = {
    users: [
        {
            id: '1',
            name: 'daniel',
            password: '123',
            points: 200,
            joined: new Date(),
            solved: []
        },
        {
            id: '2',
            name: 'marie',
            password: '21',
            points: 200,
            joined: new Date(),
            solved: [
                {
                    logoId: '1',
                    hintIsOpen: 'true',
                    logoIsSolved: 'false'
                },
                {
                    logoId: '2',
                    hintIsOpen: 'true',
                    logoIsSolved: 'false'
                }
            ]
        }
    ]
}

app.post('/signin', (req, res) => {
    //console.log('entro al signin');
    //let found = false;
    db.select('*')
        .from('users')
        .where('name', '=', req.body.name)
        .then(user => {
            console.log(user);
            found = true;
            if (bcrypt.compareSync(req.body.password, user[0].password)) {
                console.log('usuario encontrado');
                return res.json(user[0]);
            } else {
                return res.json('wrong password');
            }
        })
        .catch(err => res.json(err));
    //return res.json('user not found');

})

app.post('/register', (req, res) => {
    const { name, password } = req.body;
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    console.log(req.body);
    db('users')
        .returning('*')
        .insert({
            name: name,
            password: hash,
            joined: new Date()
        }).then(user => {
            res.json(user[0]);
        }).catch(err => res.status(400).json(err));
})

/*
app.get('/profile/:id', (req, res) => {
    const { id } = req.params;
    let found = false;
    database.users.forEach((user) => {
        if (user.id === id) {
            res.json(user);
            found = true;
        }
    })
    if (!found) res.json('user not found');
})
*/

app.get('/', (req, res) => {
    res.send('its working');
})

app.post('/solved', (req, res) => {
    const { userId } = req.body;
    db.select('*').from('solvedlogos').where('user_id', '=', userId)
        .then(logos => {
            res.json(logos);
        })
        .catch(err => res.json(err));
})

app.put('/update', (req, res) => {
    const { userId, logoId, hintIsOpen, logoIsSolved, points } = req.body;

    const updatedValues = {
        user_id: userId,
        logoid: logoId,
        hintisopen: hintIsOpen,
        logoissolved: logoIsSolved
    };

    db.select('*')
        .from('solvedlogos')
        .where('user_id', '=', userId)
        .andWhere('logoid', '=', logoId)
        .then(logo => {
            if (logo.length > 0) {
                db('solvedlogos')
                    .where('user_id', '=', userId)
                    .andWhere('logoid', '=', logoId)
                    .update(updatedValues)
                    .then(() => {
                        res.json('done');
                    })
                    .catch(err => {
                        console.error('Error updating row:', err);
                        res.status(500).json('Internal error');
                    });
            } else {
                db('solvedlogos')
                    .insert(updatedValues)
                    .then(() => {
                        res.json('inserted');
                    })
                    .catch(err => {
                        console.error('Error inserting row:', err);
                        res.status(500).json('Internal error');
                    });
            }
        })
        .catch(err => {
            console.error('Error connecting to the database:', err);
            res.status(500).json('Internal error');
        });

    db('users')
        .where('id', userId)
        .update({ points: points })
        .catch(err => {
            console.error('Error al actualizar los puntos:', err);
            res.status(500).json('Error interno del servidor');
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