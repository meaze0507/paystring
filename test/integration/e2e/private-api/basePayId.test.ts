import * as request from 'supertest'
import 'mocha'

import App from '../../../../src/app'
import HttpStatus from '../../../../src/types/httpStatus'
import { appSetup, appCleanup } from '../../../helpers/helpers'

let app: App
const payIdApiVersion = '2020-05-28'

describe('E2E - privateAPIRouter - GET /users', function (): void {
  before(async function () {
    app = await appSetup()
  })
  // TODO:(hbergren) beforeEach seed the database. That way we always start with a clean slate, and tests aren't interdependent.

  it('Returns a 200 and correct information for a user known to exist', function (done): void {
    // GIVEN a PayID known to resolve to an account on the PayID service
    const payId = 'alice$xpring.money'
    const expectedResponse = {
      payId: 'alice$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVacixsWrqyWCr98eTYP7FSzE9NwupESR4TrnijN7fccNiS',
          },
        },
      ],
    }

    // WHEN we make a GET request to /users/ with that PayID as our user
    request(app.privateAPIExpress)
      .get(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .expect('Content-Type', /json/u)
      // THEN We expect back a 200 - OK, with the account information
      .expect(HttpStatus.OK, expectedResponse, done)
  })

  it('Returns a 404 for an unknown PayID', function (done): void {
    // GIVEN a PayID known to not exist on the PayID service
    const payId = 'johndoe$xpring.money'
    const expectedErrorResponse = {
      statusCode: 404,
      error: 'Not Found',
      message:
        'No information could be found for the PayID johndoe$xpring.money.',
    }

    // WHEN we make a GET request to /users/ with that PayID as our user
    request(app.privateAPIExpress)
      .get(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .expect('Content-Type', /json/u)
      // THEN We expect back a 404 - Not Found, with the expected error response object
      .expect(HttpStatus.NotFound, expectedErrorResponse, done)
  })

  after(function () {
    appCleanup(app)
  })
})

describe('E2E - privateAPIRouter - POST /users', function (): void {
  before(async function () {
    app = await appSetup()
  })

  it('Returns a 201 when creating a new user', function (done): void {
    // GIVEN a user with a PayID known to not exist on the PayID service
    const userInformation = {
      payId: 'johndoe$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVQWr6BhgBLW2jbFyqqufgq8T9eN7KresB684ZSHKQ3oDth',
          },
        },
        {
          paymentNetwork: 'BTC',
          environment: 'TESTNET',
          details: {
            address: 'mxNEbRXokcdJtT6sbukr1CTGVx8Tkxk3DB',
          },
        },
      ],
    }

    // WHEN we make a POST request to /users with that user information
    request(app.privateAPIExpress)
      .post(`/users`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(userInformation)
      .expect('Content-Type', /text\/plain/u)
      // THEN we expect the Location header to be set to the path of the created user resource
      .expect('Location', `/users/${userInformation.payId}`)
      // AND we expect back a 201 - CREATED
      .expect(HttpStatus.Created, done)
  })

  it('Returns a 201 when creating a new user with an address without an environment (ACH)', function (done): void {
    // GIVEN a user with a PayID known to not exist on the PayID service
    const userInformation = {
      payId: 'janedoe$xpring.money',
      addresses: [
        {
          paymentNetwork: 'ACH',
          details: {
            accountNumber: '000123456789',
            routingNumber: '123456789',
          },
        },
      ],
    }

    // WHEN we make a POST request to /users with that user information
    request(app.privateAPIExpress)
      .post(`/users`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(userInformation)
      .expect('Content-Type', /text\/plain/u)
      // THEN we expect the Location header to be set to the path of the created user resource
      .expect('Location', `/users/${userInformation.payId}`)
      // AND we expect back a 201 - CREATED
      .expect(HttpStatus.Created, done)
  })

  it('Returns a 201 - creates PayID containing a "."', function (done): void {
    // GIVEN a user with a PayID containing a period
    const userInformation = {
      payId: 'alice.smith$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVQWr6BhgBLW2jbFyqqufgq8T9eN7KresB684ZSHKQ3oDth',
          },
        },
      ],
    }

    // WHEN we make a POST request to /users with that user information
    request(app.privateAPIExpress)
      .post(`/users`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(userInformation)
      .expect('Content-Type', /text\/plain/u)
      // THEN we expect back a 201 - CREATED
      .expect(HttpStatus.Created, done)
  })

  it('Returns a 409 - Conflict when attempting to create a user that already exists', function (done): void {
    // GIVEN a user with a PayID known already on the PayID service
    const userInformation = {
      payId: 'alice$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVQWr6BhgBLW2jbFyqqufgq8T9eN7KresB684ZSHKQ3oDth',
          },
        },
      ],
    }
    // AND our expected error response
    const expectedErrorResponse = {
      statusCode: 409,
      error: 'Conflict',
      message: 'There already exists a user with the provided PayID',
    }

    // WHEN we make a POST request to /users with that user information
    request(app.privateAPIExpress)
      .post(`/users`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(userInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 409 - CONFLICT and our expected error response
      .expect(HttpStatus.Conflict, expectedErrorResponse, done)
  })

  after(function () {
    appCleanup(app)
  })
})

describe('E2E - privateAPIRouter - PUT /users', function (): void {
  before(async function () {
    app = await appSetup()
  })

  it('Returns a 200 and updated user payload when updating an address', function (done): void {
    // GIVEN a PayID known to resolve to an account on the PayID service
    const payId = 'alice$xpring.money'
    const updatedInformation = {
      payId: 'alice$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }

    // WHEN we make a PUT request to /users/ with the new information to update
    request(app.privateAPIExpress)
      .put(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(updatedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 200-OK, with the updated user information
      .expect(HttpStatus.OK, updatedInformation, done)
  })

  it('Returns a 200 and updated user payload when updating a PayID', function (done): void {
    // GIVEN a PayID known to resolve to an account on the PayID service
    const payId = 'alice$xpring.money'
    const updatedInformation = {
      payId: 'charlie$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }

    // WHEN we make a PUT request to /users/ with the new information to update
    request(app.privateAPIExpress)
      .put(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(updatedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 200-OK, with the updated user information
      .expect(HttpStatus.OK, updatedInformation, done)
  })

  it('Returns a 201 and inserted user payload for a private API PUT creating a new user', function (done): void {
    // GIVEN a PayID known to not exist on the PayID service
    const payId = 'notjohndoe$xpring.money'
    const insertedInformation = {
      payId: 'johndoe$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }

    // WHEN we make a PUT request to /users/ with the information to insert
    request(app.privateAPIExpress)
      .put(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(insertedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect the Location header to be set to the path of the created user resource
      // Note that the PayID inserted is that of the request body, not the URL path
      .expect('Location', `/users/${insertedInformation.payId}`)
      // AND we expect back a 201 - CREATED, with the inserted user information
      .expect(HttpStatus.Created, insertedInformation, done)
  })

  it('Returns a 400 - Bad Request with an error payload for a request with a malformed PayID', function (done): void {
    // GIVEN a PayID known to be in a bad format (missing $) and an expected error response payload
    const badPayId = 'alice.xpring.money'
    const expectedErrorResponse = {
      error: 'Bad Request',
      message: 'Bad input. PayIDs must contain a "$"',
      statusCode: 400,
    }
    const updatedInformation = {
      payId: 'alice$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }
    // WHEN we make a PUT request to /users/ with the new information to update
    request(app.privateAPIExpress)
      .put(`/users/${badPayId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(updatedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 400 - Bad Request, with the expected error payload response
      .expect(HttpStatus.BadRequest, expectedErrorResponse, done)
  })

  it('Returns a 400 - Bad Request with an error payload for a request with an existing PayID with multiple "$"', function (done): void {
    // GIVEN a PayID known to be in a bad format (multiple $) and an expected error response payload
    const badPayId = 'alice$bob$xpring.money'
    const expectedErrorResponse = {
      error: 'Bad Request',
      message: 'Bad input. PayIDs must contain only one "$"',
      statusCode: 400,
    }
    const updatedInformation = {
      payId: 'alice$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }
    // WHEN we make a PUT request to /users/ with the new information to update
    request(app.privateAPIExpress)
      .put(`/users/${badPayId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(updatedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 400 - Bad Request, with the expected error payload response
      .expect(HttpStatus.BadRequest, expectedErrorResponse, done)
  })

  it('Returns a 400 - Bad Request with an error payload for a request to update a PayID to a new value containing multiple "$"', function (done): void {
    // GIVEN a PayID known to be in a bad format (missing $) and an expected error response payload
    const badPayId = 'alice$xpring.money'
    const expectedErrorResponse = {
      error: 'Bad Request',
      message: 'Bad input. PayIDs must contain only one "$"',
      statusCode: 400,
    }
    const updatedInformation = {
      payId: 'alice$bob$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }
    // WHEN we make a PUT request to /users/ with the new information to update
    request(app.privateAPIExpress)
      .put(`/users/${badPayId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(updatedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 400 - Bad Request, with the expected error payload response
      .expect(HttpStatus.BadRequest, expectedErrorResponse, done)
  })

  it('Returns a 409 - Conflict when attempting to update a user to a PayID that already exists', function (done): void {
    // GIVEN a PayID known to resolve to an account on the PayID service
    const payId = 'charlie$xpring.money'
    const updatedInformation = {
      // AND a request to update that PayID to one known to already exist on the PayID Service
      payId: 'bob$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }
    // AND our expected error response
    const expectedErrorResponse = {
      statusCode: 409,
      error: 'Conflict',
      message: 'There already exists a user with the provided PayID',
    }

    // WHEN we make a PUT request to /users/ with the new information to update
    request(app.privateAPIExpress)
      .put(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(updatedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 409 - CONFLICT and our expected error response
      .expect(HttpStatus.Conflict, expectedErrorResponse, done)
  })

  it('Returns a 409 - Conflict when attempting to PUT a new user to a PayID that already exists', function (done): void {
    // GIVEN a PayID known to not resolve to an account on the PayID service
    const payId = 'janedoe$xpring.money'
    // AND a request to update that PayID to one known to already exist on the PayID Service
    const updatedInformation = {
      payId: 'bob$xpring.money',
      addresses: [
        {
          paymentNetwork: 'XRPL',
          environment: 'TESTNET',
          details: {
            address: 'TVZG1yJZf6QH85fPPRX1jswRYTZFg3H4um3Muu3S27SdJkr',
          },
        },
      ],
    }
    // AND our expected error response
    const expectedErrorResponse = {
      statusCode: 409,
      error: 'Conflict',
      message: 'There already exists a user with the provided PayID',
    }

    // WHEN we make a PUT request to /users/ with the new information to update
    request(app.privateAPIExpress)
      .put(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      .send(updatedInformation)
      .expect('Content-Type', /json/u)
      // THEN we expect back a 409 - CONFLICT and our expected error response
      .expect(HttpStatus.Conflict, expectedErrorResponse, done)
  })

  after(function () {
    appCleanup(app)
  })
})

describe('E2E - privateAPIRouter - DELETE /users', function (): void {
  before(async function () {
    app = await appSetup()
  })

  it('Returns a 204 and no payload when deleting an account', function (done): void {
    // GIVEN a PayID known to resolve to an account on the PayID service
    const payId = 'alice$xpring.money'
    const missingPayIdError = {
      error: 'Not Found',
      message: `No information could be found for the PayID ${payId}.`,
      statusCode: 404,
    }

    // WHEN we make a DELETE request to /users/ with the PayID to delete
    request(app.privateAPIExpress)
      .delete(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      // THEN we expect back a 204-No Content, indicating successful deletion
      .expect(HttpStatus.NoContent)
      .then((_res) => {
        // AND subsequent GET requests to that PayID now return a 404
        request(app.privateAPIExpress)
          .get(`/users/${payId}`)
          .set('PayID-API-Version', payIdApiVersion)
          .expect(HttpStatus.NotFound, missingPayIdError, done)
      })
      .catch((err) => {
        done(err)
      })
  })

  it('Returns a 204  when attempting to delete an account that does not exist', function (done): void {
    // GIVEN a PayID known to not exist on the PayID service
    const payId = 'johndoe$xpring.money'

    // WHEN we make a DELETE request to /users/ with the PayID to delete
    request(app.privateAPIExpress)
      .delete(`/users/${payId}`)
      .set('PayID-API-Version', payIdApiVersion)
      // THEN we expect back a 204 - No Content
      .expect(HttpStatus.NoContent, done)
  })

  after(function () {
    appCleanup(app)
  })
})
