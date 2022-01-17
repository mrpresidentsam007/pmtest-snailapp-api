const express = require('express')
const isAuth = require('./src/isAuth')
const typeorm = require('typeorm')
const cors = require('cors')
const env = require('dotenv').config()
const passport = require('passport')
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

//Load Enitities
const User = require('./src/entities/User')
const SnailLog = require('./src/entities/SnailLog')

//Environment Variables
const password = process.env.MYSQL_PASSWORD
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET

const main = async () => {
  // Craete Connection "default"
  await typeorm
    .createConnection({
      name: 'default',
      type: 'mysql',
      host: '127.0.0.1',
      username: 'root',
      password: password,
      database: 'snail_log_db',
      autoSchemaSync: true,
      entities: ['./src/entities/*.js'],
      logging: true,
      synchronize: true,
      charset: 'utf8mb4_unicode_ci',
    })
    .catch((err) => {
      console.log(err)
    })

  //Initialize express 'as' app
  const app = express()

  // Serialize User using passport
  passport.serializeUser(function (user, done) {
    done(null, user.accessToken)
  })

  //deserialize User using passport
  passport.deserializeUser(function (accessToken, done) {
    done(null, accessToken)
  })

  //Use Cookie Parser
  app.use(require('cookie-parser')())

  //Use Body Parser
  app.use(require('body-parser').urlencoded({ extended: true }))

  // Use express-session which is required for passport
  app.use(
    require('express-session')({
      secret: 'keyboard cat',
      resave: true,
      saveUninitialized: true,
    }),
  )

  // Enabling CORS
  app.use(cors({ origin: '*' }))
  app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Content-Length, X-Requested-With',
    )
    next()
  })

  //Allow Server to Initialize Passport
  app.use(passport.initialize())
  app.use(express.json())

  // Get Connection "default" and Load neccessary Repositories
  const connection = typeorm.getConnection('default')
  let userRepository = connection.getRepository(User)
  let snailLogRepository = connection.getRepository(SnailLog)

  //define Github Strategy
  var GitHubStrategy = require('passport-github').Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: 'http://localhost:3002/auth/github/callback',
      },
      async (_, __, profile, cb) => {
        const payload = profile._json
        console.log(payload)

        //Find the user in the database
        let user = await userRepository.findOne({
          where: {
            githubId: payload.id,
          },
        })

        let userID
        let userDetail
        // if User exists, Update the user
        if (user) {
          let newUser = {
            name: payload.name,
            email: payload.email,
          }
          await userRepository.update(user.id, newUser)
        }
        // Create new user
        else {
          let newUser = {
            githubId: payload.id,
            name: payload.name,
            email: payload.email,
          }
          userDetail = await userRepository.save(newUser)
        }
        if (user) {
          userID = user.id
        } else {
          userID = userDetail.id
        }
        // Callback to create Token using JWT
        cb(null, {
          accessToken: jwt.sign({ userId: userID }, process.env.SECRET, {
            expiresIn: '1y',
          }),
        })
      },
    ),
  )

  //define Twitter Strategy
  var TwitterStrategy = require('passport-twitter').Strategy
  passport.use(
    new TwitterStrategy(
      {
        consumerKey: process.env.TWITTER_KEY,
        consumerSecret: process.env.TWITTER_SECRET,
        callbackURL: 'http://localhost:3002/auth/twitter/callback',
      },
      async (_, __, profile, cb) => {
        const payload = profile._json
        console.log(payload)

        //Find the user in the database
        let user = await userRepository.findOne({
          where: {
            twitterId: payload.id,
          },
        })

        // if User exists, Update the user
        if (user) {
          let newUser = {
            name: payload.name,
            email: payload.email,
          }
          await userRepository.update(user.id, newUser)
        }
        // Create new user
        else {
          let newUser = {
            twitterId: payload.id,
            name: payload.name,
            email: payload.email,
          }
          await userRepository.save(newUser)
        }
        // Callback to create Token using JWT
        cb(null, {
          accessToken: jwt.sign({ userId: user.id }, process.env.SECRET, {
            expiresIn: '1y',
          }),
        })
      },
    ),
  )

  //define GoogleS trategy
  var GoogleStrategy = require('passport-google-oauth20').Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          'http://localhost:3002/oauth2/redirect/accounts.google.com',
      },
      async (_, __, profile, cb) => {
        const payload = profile._json
        console.log(payload)

        //Find the user in the database
        let user = await userRepository.findOne({
          where: {
            googleId: payload.sub,
          },
        })

        let userID
        let userDetail
        // if User exists, Update the user
        if (user) {
          let newUser = {
            name: payload.name,
            email: payload.email,
          }
          await userRepository.update(user.id, newUser)
        }
        // Create new user
        else {
          let newUser = {
            googleId: payload.sub,
            name: payload.name,
            email: payload.email,
          }
          userDetail = await userRepository.save(newUser)
        }
        if (user) {
          userID = user.id
        } else {
          userID = userDetail.id
        }
        // Callback to create Token using JWT
        cb(null, {
          accessToken: jwt.sign({ userId: userID }, process.env.SECRET, {
            expiresIn: '1y',
          }),
        })
      },
    ),
  )

  // Github Authentication
  app.get('/auth/github', passport.authenticate('github'))
  app.get('/auth/github/callback', passport.authenticate('github'), function (
    req,
    res,
  ) {
    //Redirect to FrontEnd App with token
    res.redirect(
      `http://localhost:8080/auth-success?token=${req.user.accessToken}`,
    )
  })

  // Twitter Authentication
  app.get('/auth/twitter', passport.authenticate('twitter'))
  app.get('/auth/twitter/callback', passport.authenticate('twitter'), function (
    req,
    res,
  ) {
    //Redirect to FrontEnd App with token
    res.redirect(
      `http://localhost:8080/auth-success?token=${req.user.accessToken}`,
    )
  })

  // Google Authentication
  app.get(
    '/auth/google',
    passport.authenticate('google', {
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/cloud-platform.read-only',
        'https://www.googleapis.com/auth/devstorage.read_only',
        'openid',
      ],
    }),
  )
  app.get(
    '/oauth2/redirect/accounts.google.com',
    passport.authenticate('google'),
    function (req, res) {
      //Redirect to FrontEnd App with token
      res.redirect(
        `http://localhost:8080/auth-success?token=${req.user.accessToken}`,
      )
    },
  )

  /* --------------------------------- OTHER ROUTES -------------------------------- */

  // Get Logged In User
  app.get('/get-user', isAuth, async (req, res) => {
    let user = await userRepository.findOne({
      where: {
        id: req.userId,
      },
    })

    res.json({ user })
  })

  //Get User Dashboard Data
  app.get('/get-dashboard-data', isAuth, async (req, res) => {
    //get the count of user snail_logs failure
    let failureCount = await snailLogRepository.count({
      where: {
        user: req.userId,
        result: 'failure',
      },
    })

    //get the count of user snail_logs success
    let successCount = await snailLogRepository.count({
      where: {
        user: req.userId,
        result: 'success',
      },
    })

    // get the count of user snail_logs
    let allCount = await snailLogRepository.count({
      where: {
        user: req.userId,
      },
    })

    res.json({ data: { failureCount, successCount, allCount } })
  })

  // Calculate Snail Endpoint
  app.post('/snail/calculate', isAuth, async (req, res) => {
    //Initialize Variables
    let SD = req.body.distanceDown // Slide Down
    let DC = req.body.distanceUp // Max Distance Up
    let FP = req.body.fatigue // Fatigue factor
    let F = (DC * FP) / 100 // Derived Factigue Factor
    let Hi = 0 // Initial Height of last day climb
    let Hs = 0 // Height after night
    let Hc = 0 // Height climb current day
    let dayy = 1
    let Hw = req.body.height
    let uid = uuidv4()

    let newDate = new Date()

    while (Hs <= Hw) {
      Hc = DC - F * (dayy - 1)
      if (Hc + Hi > Hw) {
        // Log Success Report
        let snail_log = {
          user: req.userId,
          day: dayy,
          H: Hs,
          U: DC,
          D: SD,
          F: FP,
          result: 'success',
          date: new Date(newDate.setDate(newDate.getDate() + dayy)),
          processId: uid,
        }
        await snailLogRepository.save(snail_log)
        break
      }
      Hs = Hi + Hc - SD

      Hi = Hs
      //Log Fail Report
      let snail_log = {
        user: req.userId,
        day: dayy,
        H: Hs,
        U: DC,
        D: SD,
        F: FP,
        result: 'failure',
        date: new Date(newDate.setDate(newDate.getDate() + dayy)),
        processId: uid,
      }
      await snailLogRepository.save(snail_log)
      if (Hs < 0) {
        break
      }
      //Increment Day
      dayy++
    }

    res.json({
      message: 'Result Calculated, View Logs',
    })
  })

  // Get Snail Logs for the Auth()->user
  app.get('/snail/distinct-logs', isAuth, async (req, res) => {
    let logs = await snailLogRepository.find({
      where: {
        user: req.userId,
      },
      order: {
        date: 'DESC',
      },
    })
    res.json({
      logs: { data: [...logs] },
    })
  })

  // Get Chart Data
  app.get('/get-chart-data', isAuth, async (req, res) => {
    let logs = await snailLogRepository.find({
      where: {
        user: req.userId,
      },
      order: {
        date: 'DESC',
      },
    })

    let results = []

    logs.forEach((log) => {
      results.push(log.result)
    })
    let filteredResults = results.filter(onlyUnique)

    var pieChart = [[], []]

    filteredResults.forEach(async (_result) => {
      let resultLog = await snailLogRepository.find({
        where: {
          user: req.userId,
          result: _result,
        },
        order: {
          result: 'DESC',
        },
      })

      let countResult = resultLog.length

      pieChart[0].push(countResult)
      pieChart[1].push(_result)

      console.log(pieChart)

      if (pieChart[1].length >= 2) {
        res.json({ chartData: pieChart })
      }
    })
  })

  function onlyUnique(value, index, self) {
    return self.indexOf(value) === index
  }

  app.listen(3002, () => {
    console.log('Listening on Port 3002')
  })
}

main()
