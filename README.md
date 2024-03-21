![GitHub Actions CI](https://github.com/B-Jones-RFD/qualtrics-api-tasks/actions/workflows/main.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/@b-jones-rfd/qualtrics-api-tasks.svg?style=flat-square)](https://www.npmjs.com/package/@b-jones-rfd/qualtrics-api-tasks)
![npm bundle size](https://img.shields.io/bundlephobia/min/%40b-jones-rfd%2Fqualtrics-api-tasks)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Qualtrics API Tasks

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

[PNPM](https://pnpm.io/) is a awesome alternative to NPM and is recommended.

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
      - [Authentication](#authentication)
      - [Contacts](#contacts)
      - [Distributions](#distributions)
      - [Responses](#responses)
      - [Mailing Lists](#mailing-lists)
      - [Messages](#messages)
      - [Utilities](#utilities)
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

const connection: Connection = createConnection(connectionOptions)

async function getBearerToken(clientId: string, clientSecret: string) {
  const result = await connection.getBearerToken({ clientId, clientSecret })
  if (result.success) return result.data
  else throw new Error(result.error)
}
```

### Factory Action Methods

Additionally, for single use or reduced import size, action factory methods can be imported directly. Call the factory method with a SiteConnectionOptions object to return an asynchronous action function that can be called directly.

```ts
import { testConnection } from '@b-jones-rfd/qualtrics-api-tasks'

async function testMyQualtricsConnection() {
  const action = testConnection(connectionOptions)
  const result = await action()
  if (result.success) return result.data
  else throw new Error(result.error)
}
```

## API

### createConnection

Create a Qualtrics API Connection instance.

```ts
type ConnectionFactory = (options: ConnectionOptions) => Connection
```

#### ConnectionOptions

```ts
type ConnectionOptions = {
  datacenterId: string
  apiToken?: string
  timeout?: number
}
```

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

#### Authentication

##### getBearerToken(options)

Implements [OAuth Authentication (Client Credentials)](https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials) and returns the access token as the result data.

`options`

| Property     | Type   | Description                       | Required |
| ------------ | ------ | --------------------------------- | -------- |
| clientId     | string | Quatrics Client ID                | Y        |
| clientSecret | string | Qualtrics Client Password         | Y        |
| scope        | string | Qualtrics Client requested scopes | Y        |

#### Contacts

##### getContactsImportStatus(options)

Implements [Get Contacts Import Status](https://api.qualtrics.com/c5d22705b1d45-get-transaction-contacts-import-status)

`options`

| Property      | Type   | Description           | Required |
| ------------- | ------ | --------------------- | -------- |
| directoryId   | string | Quatrics Directory ID | Y        |
| importId      | string | Contacts Import ID    | Y        |
| mailingListId | string | Mailing List ID       | Y        |
| bearerToken   | string | Valid Bearer Token    | N        |

##### getContactsImportSummary(options)

Implements [Get Contacts Import Summary](https://api.qualtrics.com/6f0480b307053-get-transaction-contacts-import-summary)

`options`

| Property      | Type   | Description           | Required |
| ------------- | ------ | --------------------- | -------- |
| directoryId   | string | Quatrics Directory ID | Y        |
| importId      | string | Contacts Import ID    | Y        |
| mailingListId | string | Mailing List ID       | Y        |
| bearerToken   | string | Valid Bearer Token    | N        |

##### importContacts(options)

Implements [Contact Import](https://api.qualtrics.com/1ac99fba8ca5b-contact-imports) multistep process

`options`

| Property        | Type      | Description           | Required |
| --------------- | --------- | --------------------- | -------- |
| directoryId     | string    | Quatrics Directory ID | Y        |
| mailingListId   | string    | Mailing List ID       | Y        |
| contacts        | Contact[] | Contacts array        | Y        |
| transactionMeta | object    | Transaction meta data | N        |
| bearerToken     | string    | Valid Bearer Token    | N        |

##### startContactsImport(options)

Implements [Create Transaction Contacts Import](https://api.qualtrics.com/bab13356ac724-create-transaction-contacts-import)

`options`

| Property        | Type      | Description           | Required |
| --------------- | --------- | --------------------- | -------- |
| directoryId     | string    | Quatrics Directory ID | Y        |
| mailingListId   | string    | Mailing List ID       | Y        |
| contacts        | Contact[] | Contacts array        | Y        |
| transactionMeta | object    | Transaction meta data | N        |
| bearerToken     | string    | Valid Bearer Token    | N        |

#### Distributions

##### createDistribution(options)

Implements [Create Distribution](https://api.qualtrics.com/573e3f0a94888-create-distribution).

`options`

| Property           | Type                   | Description                        | Required | Default |
| ------------------ | ---------------------- | ---------------------------------- | -------- | ------- |
| libraryId          | string                 | Quatrics Library ID                | Y        |         |
| messageId          | string                 | Qualtrics Message ID               | Y        |         |
| messageText        | string                 | Message text to send               | N        |         |
| mailingListId      | string                 | Mailing List ID                    | Y        |         |
| contactId          | string                 | Contact lookup ID for individual   | N        |         |
| transactionBatchId | string                 | Transaction Batch ID               | N        |         |
| fromEmail          | string                 | Originating email                  | Y        |         |
| replyToEmail       | string                 | Email reply-to address             | N        |         |
| fromName           | string                 | Email from name                    | Y        |         |
| subject            | string                 | Email subject                      | Y        |         |
| surveyId           | string                 | Qualtrics Survey ID                | Y        |         |
| expirationDate     | Date                   | Distribution expiration date time  | Y        |         |
| type               | enum                   | Individual, Multiple, or Anonymous | Y        |         |
| embeddedData       | Record<string, string> | Up to 10 subkeys                   | N        |         |
| sendDate           | Date                   | Date time to send                  | Y        |         |
| bearerToken        | string                 | Valid Bearer Token                 | N        |         |

##### createReminder(options)

Implements [Create Reminder Distribution](https://api.qualtrics.com/764630bb0633a-create-reminder-distribution).

`options`

| Property       | Type                   | Description              | Required |
| -------------- | ---------------------- | ------------------------ | -------- |
| distributionId | string                 | Previous Distribution ID | Y        |
| libraryId      | string                 | Quatrics Library ID      | Y        |
| fromEmail      | string                 | Originating email        | Y        |
| messageId      | string                 | Qualtrics Message ID     | Y        |
| replyToEmail   | string                 | Email reply-to address   | N        |
| fromName       | string                 | Email from name          | Y        |
| subject        | string                 | Email subject            | Y        |
| embeddedData   | Record<string, string> | Up to 10 subkeys         | N        |
| sendDate       | Date                   | Date time to send        | Y        |
| bearerToken    | string                 | Valid Bearer Token       | N        |

##### getDistribution(options)

Implements [Get Distribution](https://api.qualtrics.com/f5b1d8775d803-get-distribution)

`options`

| Property       | Type   | Description        | Required |
| -------------- | ------ | ------------------ | -------- |
| distributionId | string | Distribution ID    | Y        |
| surveyId       | string | Survey ID          | Y        |
| bearerToken    | string | Valid Bearer Token | N        |

##### listDistributions(options)

Implements [List Distributions](https://api.qualtrics.com/234bb6b16cf6d-list-distributions)

`options`

| Property                | Type    | Description                     | Required | Default |
| ----------------------- | ------- | ------------------------------- | -------- | ------- |
| surveyId                | string  | Quatrics Survey ID              | Y        |         |
| distributionRequestType | string  | Distribution Request Type       | Y        |         |
| mailingListId           | string  | Mailing List ID                 | Y        |         |
| sendStartDate           | Date    | Export start date and time      | Y        |         |
| sendEndDate             | Date    | Export end date and time        | Y        |         |
| skipToken               | string  | Pagination offset               | N        |         |
| useNewPaginationScheme  | boolean | Use updated pagination          | N        | false   |
| pageSize                | number  | Distribution elements to return | N        | 100     |
| bearerToken             | string  | Valid Bearer Token              | N        |         |

#### Responses

##### exportResponses(options)

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

##### getResponseExportFile(options)

Implements [Get Response Export File](https://api.qualtrics.com/41296b6f2e828-get-response-export-file)

`options`

| Property    | Type   | Description        | Required |
| ----------- | ------ | ------------------ | -------- |
| surveyId    | string | Quatrics Survey ID | Y        |
| fileId      | string | File ID            | Y        |
| bearerToken | string | Valid Bearer Token | N        |

##### getResponseExportProgress(options)

Implements [Get Response Export Progress](https://api.qualtrics.com/37e6a66f74ab4-get-response-export-progress)

`options`

| Property         | Type   | Description        | Required |
| ---------------- | ------ | ------------------ | -------- |
| surveyId         | string | Quatrics Survey ID | Y        |
| exportProgressId | string | Progress ID        | Y        |
| bearerToken      | string | Valid Bearer Token | N        |

#### Mailing Lists

##### createMailingList(options)

Implements [Create Mailing List](https://api.qualtrics.com/3f633e4cea6cd-create-mailing-list)

`options`

| Property               | Type    | Description                      | Required | Default |
| ---------------------- | ------- | -------------------------------- | -------- | ------- |
| directoryId            | string  | Quatrics Directory ID            | Y        |         |
| name                   | string  | Mailing List Name                | Y        |         |
| ownerId                | string  | Owner ID                         | Y        |         |
| prioritizeListMetadata | boolean | Import metadata as list metadata | N        | false   |
| bearerToken            | string  | Valid Bearer Token               | N        |         |

#### Messages

##### listLibraryMessages(options)

Implements [List Library Messages](https://api.qualtrics.com/1d60a66b340fa-list-library-messages)

`options`

| Property    | Type   | Description         | Required |
| ----------- | ------ | ------------------- | -------- |
| libraryId   | string | Quatrics Library ID | Y        |
| category    | string | Message category    | N        |
| offset      | number | Pagination offset   | N        |
| bearerToken | string | Valid Bearer Token  | N        |

##### startResponseExports(options)

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

#### Utilities

##### testConnection(bearerToken)

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
