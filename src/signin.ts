import { APIGatewayProxyResult } from 'aws-lambda'
import AWS from 'aws-sdk'

const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider()

interface UsersCredentials {
  username: string
  password: string
}

export async function handler(event: any): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body!) as UsersCredentials
  const { username, password } = body
  
  if (!username || !password) {
    return response(400, { error: 'You must specify the username and password' })
  }

  return cognitoIdentityServiceProvider.initiateAuth({
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
    ClientId: process.env.COGNITO_CLIENT_ID!,
  }).promise().then((result) => response(200, { message: result.AuthenticationResult }))
    .catch((e) => response(e.statusCode, { error: e.message }))
}

const response = (responseCode: number, body: object) => ({
  statusCode: responseCode,
  body: JSON.stringify(body,
    null,
    2,
  ),
})