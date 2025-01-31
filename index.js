require('dotenv').config()
const express = require('express')
const cors = require('cors')
require('dotenv').config()
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const port = process.env.PORT || 7000
const app = express()
// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mq0mae1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const uri =`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fmsye.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
//  const uri =`mongodb+srv://<db_username>:<db_password>@cluster0.fmsye.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const db = client.db('hatsData')
    const usersCollection = db.collection('users')
    const AppointmentsCollection = db.collection('appointments')
    const ArtifactsCollection = db.collection('artifacts')
    // Generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })


    app.post('/users/:email', async (req, res) => {
      try {
        const { email } = req.params; // Get the email from the request params
        const { name, image } = req.body; // Extract name and image from the request body
    
        if (!email) {
          return res.status(400).json({ message: 'Email is required' });
        }
    
        if (!name || !image) {
          return res.status(400).json({ message: 'Name and Image are required' });
        }
    
        // Check if the user already exists in the database
        const existingUser = await usersCollection.findOne({ email });
    
        if (existingUser) {
          // Update the user information if the user already exists
          await usersCollection.updateOne(
            { email },
            { $set: { name, image } }
          );
          return res.status(200).json({ message: 'User information updated successfully' });
        } else {
          // Insert a new user if not found
          await usersCollection.insertOne({ email, name, image });
          return res.status(201).json({ message: 'New user added successfully' });
        }
      } catch (error) {
        console.error('Error updating/creating user:', error);
        res.status(500).json({ message: 'Internal Server Error' });
      }
    });

    // app.post('/users/:email', async (req, res) => {
      
    //   const email = req.params.email
    //   const query = { email }
    //   const user = req.body
    //   // check if user exists in db
    //   const isExist = await usersCollection.findOne(query)
    //   if (isExist) {
    //     return res.send(isExist)
    //   }
    //   const result = await usersCollection.insertOne({
    //     ...user,
    //     role: 'user',
    //     timestamp: Date.now(),
    //   })
    //   res.send(result)
    // })


    // API route to get user data by email

app.get('/user', async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await usersCollection.findOne({ email });

    if (!user) {       
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching user data' });
  }
});

    // manage user status and role
    app.patch('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { email }
      const user = await usersCollection.findOne(query)
      if (!user || user?.status === 'Requested')
        return res
          .status(400)
          .send('You have already requested, wait for some time.')

      const updateDoc = {
        $set: {
          status: 'Requested',
        },
      }
      const result = await usersCollection.updateOne(query, updateDoc)
      console.log(result)
      res.send(result)
    })
    // saving appointment
    app.post('/artifacts/addAppointments', async(req, res)=> {
      try{
        const appointmentData = req.body;
        const result = await AppointmentsCollection.insertOne(appointmentData);
        res.status(201).json({ message: 'Appointment saved successfully!', result });

      }
      catch(error){
        
        console.error('Error saving appointment:', error);
        res.status(500).json({ message: 'Failed to save appointment' });
      }
    })

    app.get('/artifacts/appointments', async (req, res) => {
      try {
        const appointments = await Appointment.find();
        res.status(200).json(appointments);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/addArtifact', async (req, res) => {
      try {
        const appointmentData = req.body;
    
        // Ensure the likeCount is always initialized to zero
        appointmentData.likeCount = 0;
    
        const result = await ArtifactsCollection.insertOne(appointmentData);
        res.status(201).json({ message: 'Appointment saved successfully!', result });
      } catch (error) {
        console.error('Error saving appointment:', error);
        res.status(500).json({ message: 'Failed to save appointment' });
      }
    });
    
    // Route to get all artifacts
  
    app.get('/artifacts', async (req, res) => {
      const { artifactType, search } = req.query;
    
      try {
        const query = {};
    
        if (artifactType) {
          query.artifactType = artifactType;
        }
    
        if (search) {
          query.name = { $regex: search, $options: 'i' };
        }
    
        const artifacts = await ArtifactsCollection.find(query).toArray(); // Ensure toArray is used
        res.json({ data: artifacts });
      } catch (err) {
        res.status(500).json({ error: 'Failed to fetch artifacts' });
      }
    });
    app.get('/filtered-artifacts', async (req, res) => {
      try {
        const { sortBy } = req.query;
    
        // Build the sorting condition
        const sortCondition = sortBy === 'likes' ? { likeCount: -1 } : {};
    
        // Fetch data from artifacts collection
        const filteredArtifacts = await ArtifactsCollection
          .find({})
          .sort(sortCondition) // Sort by highest like count if requested
          .limit(6) // Limit to top 6 artifacts
          .toArray();
    
        res.send({ success: true, data: filteredArtifacts });
      } catch (error) {
        console.error('Error in /filtered-artifacts endpoint:', error);
        res.status(500).send({
          success: false,
          message: 'Failed to fetch artifacts.',
        });
      }
    });

    app.patch('/artifacts/:id/like', async (req, res) => {
      try {
        const { id } = req.params;
    
        // Increment the like count by 1
        const updatedArtifact = await ArtifactsCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { likesCount: 1 } },
          { returnDocument: 'after' }
        );
    
        if (!updatedArtifact.value) {
          return res.status(404).send({ success: false, message: 'Artifact not found' });
        }
    
        res.send({ success: true, data: updatedArtifact.value });
      } catch (error) {
        console.error('Error updating like count:', error);
        res.status(500).send({
          success: false,
          message: 'Failed to update like count.',
        });
      }
    });

    app.get('/:id', async (req, res) => {
      try {
        const artifact = await ArtifactsCollection.findById(req.params.id);
        if (!artifact) return res.status(404).json({ message: 'Artifact not found' });
        res.json(artifact);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching artifact' });
      }
    });
    
    
      
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // Send a ping to confirm a successful connection
    // await client.db('admin').command({ ping: 1 })
    // console.log(
    //   'Pinged your deployment. You successfully connected to MongoDB!'
    // )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from Historical Artifacts Tracker Server..')
})

app.listen(port, () => {
  console.log(`Historical Artifacts Tracker is running on port ${port}`)
})
