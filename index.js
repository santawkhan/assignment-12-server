const express = require('express');
const req = require('express/lib/request');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;



// middleware//
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const res = require('express/lib/response');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hgorb8t.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const Courses = client.db("courses").collection("coursesCollection");
        const userCollection = client.db("courses").collection("users");
        const selectedCollection = client.db("courses").collection("selectedClass")
        const paymentCollection = client.db("courses").collection("paymentClass")



        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })


        app.get('/courses', async (req, res) => {
            const query = {};
            const options = {
                // sort matched documents in descending order by rating
                sort: { "seats": -1 },

            };
            const cursor = Courses.find(query, options)
            const result = await cursor.toArray();
            res.send(result);
        })


        app.get('/Course', async (req, res) => {
            console.log(req.query.email);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await Courses.find(query).toArray();
            res.send(result);
        })

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email, }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'already taken' })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })



        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            console.log(price, amount)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card']
            })

            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })



        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.post('/courses', async (req, res) => {
            const newItem = req.body;
            const result = await Courses.insertOne(newItem)
            res.send(result)
        })

        app.post('/selectedClass', async (req, res) => {
            const Item = req.body;
            const result = await selectedCollection.insertOne(Item)
            res.send(result)
        })
        app.delete('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await selectedCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/mySelectedClass', async (req, res) => {
            console.log(req.query.email);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await selectedCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/enrolled', async (req, res) => {
            console.log(req.query.email);
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const result = await paymentCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);

        })
        app.get('/users/instructor/:email', async (req, res) => {
            const email = req.params.email;

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);

        })

        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'instructor'
                }
            }

            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })
        app.patch('/courses/approve/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'approved'
                }
            }

            const result = await Courses.updateOne(filter, updateDoc);
            res.send(result);
        })
        app.patch('/courses/seats/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    $inc: { seats: -1 }
                }
            }

            const result = await Courses.updateOne(filter, updateDoc);
            res.send(result);
        })

        // app.patch('/courses/:courseId/book', async(req, res) => {
        //     const courseId = req.params.id;
        //   const query = {seats:seats}
        //   const data =await Courses.findOne(query)
        //     // Check if the course is available
        //     if (data > 0) {
        //       // Decrease the number of available seats
        //        const result=data--;


        //     }})          
        app.patch('/courses/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'denied'
                }
            }

            const result = await Courses.updateOne(filter, updateDoc);
            res.send(result);
        })




        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const insertResult = await paymentCollection.insertOne(payment);

            const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
            const deleteResult = await selectedCollection.deleteOne(query)
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    $inc: { seats: -1 }
                }
            }
            const result = await Courses.updateOne(filter, updateDoc);
            res.send({ insertResult, deleteResult, result });
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('server is running')
})


app.listen(port, () => {
    console.log(`server is running on port  ${port}`)
})

