[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# qualtrics-api-tasks

Helpers to perform common tasks using the [Qualtrics API](https://api.qualtrics.com/). This is an exercise to avoid code reuse in my own projects. Use at your own risk.

## Prerequisites

This project requires NodeJS (version >= 18) and NPM.
[Node](http://nodejs.org/) and [NPM](https://npmjs.org/) are really easy to install.
To make sure you have them available on your machine,
try running the following command.

```sh
$ npm -v && node -v
10.2.4
v20.11.1
```

[PNPM] (https://pnpm.io/) is a awesome alternative to NPM and is recommended.

## Table of contents

- [Qualtrics API Tasks](#qualtics-api-tasks)
  - [Prerequisites](#prerequisites)
  - [Table of contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Usage](#usage)
  - [API](#api)
    - [createConnection](#createSiteConnection)
    - [Actions](#actions)
    - [Responses](#responses)
  - [Contributing](#contributing)
  - [Versioning](#versioning)
  - [Authors](#authors)
  - [License](#license)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes. See deployment for notes on how to deploy the project on a live system.

## Installation

**BEFORE YOU INSTALL:** please read the [prerequisites](#prerequisites)

To install and set up the library, run:

```sh
$ npm i @b-jones-rfd/qualtrics-api-tasks
```

Or if you prefer using Yarn:

```sh
$ yarn add @b-jones-rfd/qualtrics-api-tasks
```

Or for PNPM:

```sh
$ pnpm add @b-jones-rfd/qualtrics-api-tasks
```

## Usage

### Instance Methods

Actions can be performed against the Qualtrics API using instance methods on a Qualtrics Connection instance.

If authenticating using [OAuth 2.0](https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials) use the getBearerToken action with a Client ID and secret to obtain a bearer token. If authenticating with an [API Token](https://api.qualtrics.com/2b4ffbd8af74e-api-key-authentication) pass the token as a connection option using the apiToken property.

```ts
import { createConnection } from '@b-jones-rfd/qualtrics-api-tasks'

const connectionOptions = {
  datacenterId: 'az1',
  apiToken: 'my API Token', // optional
  timeout: 20000, // optional timeout in milliseconds, default is 30 seconds
}

const connection: SiteConnection = createConnection(connectionOptions)

async function getBearerToken(clientId: string, clientSecret: string) {
  const contents = await connection.getBearerToken({ clientId, clientSecret })
  if (contents.success) return contents.data
  else throw new Error(contents.error)
}
```

### Factory Action Methods

Additionally, for single use or reduced import size, action factory methods can be imported directly. Call the factory method with a SiteConnectionOptions object to return an asynchronous action function that can be called directly.

```ts
import { testConnection } from '@b-jones-rfd/qualtrics-api-tasks'

async function testMyQualtricsConnection(listName: string) {
  const action = testConnection(connectionOpts)
  const contents = await action()
  if (contents.success) return 'Successful connection!'
  else throw new Error(contents.error)
}
```

## API

### createSiteConnection

#### ConnectionOptions

`datacenterId`

| Type   | Description              | Example | Required |
| ------ | ------------------------ | ------- | -------- |
| string | Qualtrics Data Center Id | 'ca1'   | Y        |

`apiToken`

| Type   | Description         | Required |
| ------ | ------------------- | -------- |
| string | Qualtrics API Token | N        |

`timeout`

| Type   | Default value | Description               | Example               | Required |
| ------ | ------------- | ------------------------- | --------------------- | -------- |
| number | 30000         | Qualtrics request timeout | sharepoint.domain.com | N        |

### Actions

Connection instance action methods.

```ts
export type Action<TConfig, TResponse> = (
  options: TConfig
) => Promise<Result<TResponse>>
```

If using the actions directly call the factory method with a ConnectionOptions object to return an action that can be used to execute a Qualtrics action.

#### getBearerToken()

Implements [OAuth Authentication (Client Credentials)](https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials)

`options`

| Property     | Type   | Description               | Required |
| ------------ | ------ | ------------------------- | -------- |
| clientId     | string | Quatrics Client ID        | Y        |
| clientSecret | string | Qualtrics Client Password | Y        |

#### testConnection(options)

`options`

| Property    | Type   | Description        | Required |
| ----------- | ------ | ------------------ | -------- |
| bearerToken | string | Valid Bearer Token | N        |

## Responses

Responses are provided based on the Result type. Success can be determined by checking the success property.

```ts
export type Result<TResponse> = Success<TResponse> | Failure
```

### Success

Response is returned in the data property.

```ts
type Success<TResponse> = { success: true; data: TResponse }
```

### Failure

Errors are returned in the error property.

```ts
type Failure = { success: false; error: string }
```

## Contributing

This is a pet project to save me time at work. It is still under development and you should use at your own risk.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/B-Jones-RFD/qualtrics-api-tasks/tags).

## Authors

- **B Jones RFD** - _Package Noob_ - [B-Jones-RFD](https://github.com/B-Jones-RFD)

## License

[MIT License](https://github.com/B-Jones-RFD/sp-rest-connect/blob/main/LICENSE)
