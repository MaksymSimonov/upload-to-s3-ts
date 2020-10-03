import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'

export type HttpEventRequest<T = null> = Omit<APIGatewayProxyEvent, 'pathParameters'> & {
  pathParameters: T
}

export type HttpResponse = Promise<APIGatewayProxyResult>

export type HttpResponseBody = {
  success: boolean,
  error?: string,
  data?: object
}

export interface UsersCredentials {
  username: string
  password: string
}