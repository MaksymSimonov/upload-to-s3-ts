import { APIGatewayProxyResult } from 'aws-lambda'
import AWS from 'aws-sdk'
import { Client } from 'pg'

const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider()

interface UsersCredentials {
  username: string
  password: string
}

const saveUser = async (username: string, password: string): Promise<string> => {
  const client = new Client({
    host: process.env.DB_HOSTNAME,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT!, 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
  })

  await client.connect()

  const tableExists = await client
    .query('SELECT EXISTS (SELECT FROM pg_tables WHERE schemaname = \'public\' AND tablename  = \'users\');')
    .then((result) => result.rows[0].exists)

  if (!tableExists) {
    await client.query(`
      CREATE TABLE public.users (id TEXT PRIMARY KEY, password TEXT NOT NULL);
    `)
  }

  return new Promise((resolve, reject) => {
    client.query(`
      INSERT INTO public.users (id, password) VALUES ('${username}', '${password}') RETURNING users.id;
    `, (err, res) => {
      if (err) {
        reject(err.message)
        return
      }
      resolve(res.rows[0].id)
    })
  })
}

export async function handler(event: any): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body!) as UsersCredentials
    const { username, password } = body

    if (!username || !password) {
      return response(400, { error: 'You must specify the username and password' })
    }

    await cognitoIdentityServiceProvider.signUp({
      Username: username,
      Password: password,
      ClientId: process.env.COGNITO_CLIENT_ID!,
    }).promise()

    const userId = await saveUser(username, password)
    
    return response(200, { message: `Signed up successfully, please check your email: ${userId}` })
  } catch (e) {
    return response(e.statusCode, { error: e.message })
  }
}

const response = (responseCode: number, body: object) => ({
  statusCode: responseCode,
  body: JSON.stringify(body,
    null,
    2,
  ),
})