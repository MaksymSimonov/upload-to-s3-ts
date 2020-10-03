import { UsersCredentials, HttpResponse, HttpResponseBody } from './types'
import AWS from 'aws-sdk'

const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider()

function response(responseCode: number, body: object) {
  return {
    statusCode: responseCode,
    body: JSON.stringify(body,
      null,
      2,
    )
  }
}

export async function handler(event: any): HttpResponse {
  const body = JSON.parse(event.body) as UsersCredentials
  const { username, password } = body
  
  if (!username || !password) {
    const responseBody: HttpResponseBody = {
      success: false,
      error: 'You must specify the username and password'
    }

    return response(400, responseBody)
  }

  return cognitoIdentityServiceProvider.initiateAuth({
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
    ClientId: process.env.COGNITO_CLIENT_ID!,
  }).promise()
  .then((result) => {
    const responseBody: HttpResponseBody = {
      success: true,
      data: { 
        ...result.AuthenticationResult 
      }
    }

    return response(200, responseBody)
  })
  .catch((e) => {
    const responseBody: HttpResponseBody = {
      success: false,
      error: e.message
    }
    return response(e.statusCode, responseBody)
  })
}
