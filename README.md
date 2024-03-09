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
  timeout: 20 * 1000, // optional timeout in milliseconds, default is 30 seconds
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

| Type   | Default value | Description               | Example | Required |
| ------ | ------------- | ------------------------- | ------- | -------- |
| number | 30000         | Qualtrics request timeout | 1000    | N        |

### Actions

Connection instance action methods.

```ts
export type Action<TConfig, TResponse> = (
  options: TConfig
) => Promise<Result<TResponse>>
```

If using the actions directly call the factory method with a ConnectionOptions object to return an action that can be used to execute a Qualtrics action.

#### exportResponses(options)

Implements [Survey Response File Export](https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide) multistep process.

`options`

| Property                        | Type     | Description                                 | Required | Default |
| ------------------------------- | -------- | ------------------------------------------- | -------- | ------- |
| surveyId                        | string   | Quatrics Survey ID                          | Y        |         |
| startDate                       | Date     | Export start date and time                  | Y        |         |
| endDate                         | Date     | Export end date and time                    | Y        |         |
| format                          | Enum     | File format                                 | N        | 'csv'   |
| breakoutSets                    | boolean  | Split multi-value fields into columns       | N        | true    |
| compress                        | boolean  | Compress final export                       | N        | true    |
| exportResponsesInProgress       | boolean  | Only export not complete                    | N        | false   |
| filterId                        | string   | Return responses matching id                | N        |         |
| formatDecimalAsComma            | boolean  | Use comma as decimal separator              | N        | false   |
| includeDisplayOrder             | boolean  | Include display order in export             | N        | false   |
| limit                           | number   | Max responses to export                     | N        |         |
| multiselectSeenUnansweredRecode | number   | Recode seen, but unanswered for multiselect | N        |         |
| newlineReplacement              | string   | Replace newline character with this         | N        |         |
| seenUnansweredRecode            | number   | Recode seen, but unanswered with this       | N        |         |
| timeZone                        | string   | Timezone used to determine response date    | N        | 'UTC"   |
| useLabels                       | boolean  | Export text of answer choice                | N        | false   |
| embeddedDataIds                 | string[] | Only export these embedded data fields      | N        |         |
| questionIds                     | string[] | Only export these question IDs              | N        |         |
| surveyMetadataIds               | string[] | Only export these metadata fields           | N        |         |
| continuationToken               | string   | Previous export continuation token          | N        |         |
| allowContinuation               | boolean  | Request continuation token                  | N        | false   |
| includeLabelColumns             | boolean  | Export two columns, recode and labels       | N        | false   |
| sortByLastModifiedDate          | boolean  | Sort responses by modified date             | N        | false   |
| bearerToken                     | string   | Valid Bearer Token                          | N        |         |

#### getBearerToken(options)

Implements [OAuth Authentication (Client Credentials)](https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials)

`options`

| Property     | Type   | Description                       | Required |
| ------------ | ------ | --------------------------------- | -------- |
| clientId     | string | Quatrics Client ID                | Y        |
| clientSecret | string | Qualtrics Client Password         | Y        |
| scope        | string | Qualtrics Client requested scopes | Y        |

#### getResponseExportFile(options)

Implements [Get Response Export File](https://api.qualtrics.com/41296b6f2e828-get-response-export-file)

`options`

| Property    | Type   | Description        | Required |
| ----------- | ------ | ------------------ | -------- |
| surveyId    | string | Quatrics Survey ID | Y        |
| fileId      | string | File ID            | Y        |
| bearerToken | string | Valid Bearer Token | N        |

#### getResponseExportProgress(options)

Implements [Get Response Export Progress](https://api.qualtrics.com/37e6a66f74ab4-get-response-export-progress)

`options`

| Property         | Type   | Description        | Required |
| ---------------- | ------ | ------------------ | -------- |
| surveyId         | string | Quatrics Survey ID | Y        |
| exportProgressId | string | Progress ID        | Y        |
| bearerToken      | string | Valid Bearer Token | N        |

#### startResponseExports(options)

Implements [Start Response Exports](https://api.qualtrics.com/6b00592b9c013-start-response-export)

`options`

| Property                        | Type     | Description                                 | Required | Default |
| ------------------------------- | -------- | ------------------------------------------- | -------- | ------- |
| surveyId                        | string   | Quatrics Survey ID                          | Y        |         |
| startDate                       | Date     | Export start date and time                  | Y        |         |
| endDate                         | Date     | Export end date and time                    | Y        |         |
| format                          | Enum     | File format                                 | N        | 'csv'   |
| breakoutSets                    | boolean  | Split multi-value fields into columns       | N        | true    |
| compress                        | boolean  | Compress final export                       | N        | true    |
| exportResponsesInProgress       | boolean  | Only export not complete                    | N        | false   |
| filterId                        | string   | Return responses matching id                | N        |         |
| formatDecimalAsComma            | boolean  | Use comma as decimal separator              | N        | false   |
| includeDisplayOrder             | boolean  | Include display order in export             | N        | false   |
| limit                           | number   | Max responses to export                     | N        |         |
| multiselectSeenUnansweredRecode | number   | Recode seen, but unanswered for multiselect | N        |         |
| newlineReplacement              | string   | Replace newline character with this         | N        |         |
| seenUnansweredRecode            | number   | Recode seen, but unanswered with this       | N        |         |
| timeZone                        | string   | Timezone used to determine response date    | N        | 'UTC"   |
| useLabels                       | boolean  | Export text of answer choice                | N        | false   |
| embeddedDataIds                 | string[] | Only export these embedded data fields      | N        |         |
| questionIds                     | string[] | Only export these question IDs              | N        |         |
| surveyMetadataIds               | string[] | Only export these metadata fields           | N        |         |
| continuationToken               | string   | Previous export continuation token          | N        |         |
| allowContinuation               | boolean  | Request continuation token                  | N        | false   |
| includeLabelColumns             | boolean  | Export two columns, recode and labels       | N        | false   |
| sortByLastModifiedDate          | boolean  | Sort responses by modified date             | N        | false   |
| bearerToken                     | string   | Valid Bearer Token                          | N        |         |

#### testConnection(bearerToken)

| Parameter   | Type   | Description        | Required |
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

[MIT License](https://github.com/B-Jones-RFD/qualtrics-api-tasks/blob/main/LICENSE)
