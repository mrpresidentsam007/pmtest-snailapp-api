// import { RequestHandler } from 'express'
const jwt = require('jsonwebtoken')

module.exports = isAuth = (req, _, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    throw new Error('1 - Not Authenticated')
  }

  const token = authHeader.split(' ')[1]

  if (token.length === 0) {
    throw new Error('2 - Not Authenticated')
  }

  try {
    const payload = jwt.verify(token, process.env.SECRET)
    req.userId = payload.userId
    next()
    return
  } catch (err) {
    console.log(err)
    throw new Error('3 - Not Authenticated')
  }
}
