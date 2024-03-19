import { describe, it, expect } from 'vitest'
import { success, failure } from '../src/utils'
import {
  safeParseBearerToken,
  safeParseTestResponse,
  safeParseStartFileExportResponse,
  safeParseFileProgressResponse,
  safeParseCreateMailingListResponse,
  safeParseStartContactsImportResponse,
  safeParseContactsImportSummary,
  safeParseContactsImportStatus,
  safeParseCreateDistributionResponse,
  safeParseCreateReminderResponse,
} from '../src/utils/parsers'

describe('safeParseBearerToken', () => {
  const fixture = {
    access_token: 'sometoken',
    token_type: 'Bearer',
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.access_token)
    const parsed = safeParseBearerToken(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when token is incorrect type', () => {
    const res = {
      result: 'bad result',
    }
    const expected = failure('Incorrect token format')
    const parsed = safeParseBearerToken(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseFileProgressResponse', () => {
  const fixture = {
    result: {
      fileId: 'sometoken',
      percentComplete: 0,
      status: 'inProgress',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result)
    const parsed = safeParseFileProgressResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when error response', () => {
    const res = {
      error: {
        errorCode: '401',
        errorMessage: 'Some error',
      },
    }
    const expected = failure(
      `${res.error.errorCode}: ${res.error.errorMessage}`
    )
    const parsed = safeParseFileProgressResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail with missing props', () => {
    const res = {
      result: {
        percentComplete: 0,
        status: 'inProgress',
      },
    }
    const expected = failure('File Progress Response invalid format')
    const parsed = safeParseFileProgressResponse(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseStartFileExportResponse', () => {
  const fixture = {
    result: {
      progressId: 'sometoken',
      percentComplete: 0,
      status: 'inProgress',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result)
    const parsed = safeParseStartFileExportResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when error response', () => {
    const res = {
      error: {
        errorCode: '401',
        errorMessage: 'Some error',
      },
    }
    const expected = failure(
      `${res.error.errorCode}: ${res.error.errorMessage}`
    )
    const parsed = safeParseStartFileExportResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail with missing props', () => {
    const res = {
      result: {
        percentComplete: 0,
        status: 'inProgress',
      },
    }
    const expected = failure('Start Export Response invalid format')
    const parsed = safeParseStartFileExportResponse(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseTestResponse', () => {
  const fixture = {
    result: {
      userId: 'testUser',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success('Connection successful')
    const parsed = safeParseTestResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      result: 'bad result',
    }
    const expected = failure('Incorrect test response format')
    const parsed = safeParseTestResponse(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseCreateMailingListResponse', () => {
  const fixture = {
    result: {
      id: 'testId',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result.id)
    const parsed = safeParseCreateMailingListResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      meta: 'bad result',
    }
    const expected = failure(`Unable to parse Create Mailing List Response`)
    const parsed = safeParseCreateMailingListResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when id is not in response', () => {
    const res = {
      result: {
        badProp: 'Test',
      },
    }
    const expected = failure(`Id missing in Create Mailing List Response`)
    const parsed = safeParseCreateMailingListResponse(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseStartContactsImportResponse', () => {
  const fixture = {
    result: {
      id: 'someId',
      contacts: [{ name: 'some name' }],
      tracking: {},
      status: 'Progress',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result)
    const parsed = safeParseStartContactsImportResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail with missing props', () => {
    const res = {
      result: {
        contacts: [{ name: 'some name' }],
        tracking: {},
        status: 'Progress',
      },
    }
    const expected = failure('Start contacts import response invalid format')
    const parsed = safeParseStartContactsImportResponse(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseContactImportSummary', () => {
  const fixture = {
    result: {
      percentComplete: 0,
      contacts: {
        count: {
          added: 100,
          updated: 20,
          failed: 0,
        },
      },
      invalidEmails: ['someone@anyisp.com'],
      transactions: {
        count: {
          created: 100,
        },
      },
      status: 'Complete',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result)
    const parsed = safeParseContactsImportSummary(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when error response', () => {
    const res = {
      error: {
        errorCode: '401',
        errorMessage: 'Some error',
      },
    }
    const expected = failure(`Unable to parse Contacts Import Summary Response`)
    const parsed = safeParseContactsImportSummary(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail with missing props', () => {
    const res = {
      result: {
        percentComplete: 0,
        status: 'inProgress',
      },
    }
    const expected = failure('Contacts import summary response invalid format')
    const parsed = safeParseContactsImportSummary(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseContactImportStatus', () => {
  const fixture = {
    result: {
      percentComplete: 0,
      contacts: {
        count: {
          added: 100,
          updated: 20,
          failed: 0,
        },
      },
      transactions: {
        count: {
          created: 100,
        },
      },
      status: 'inProgress',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result)
    const parsed = safeParseContactsImportStatus(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when error response', () => {
    const res = {
      error: {
        errorCode: '401',
        errorMessage: 'Some error',
      },
    }
    const expected = failure(`Unable to parse Contacts Import Summary Response`)
    const parsed = safeParseContactsImportStatus(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail with missing props', () => {
    const res = {
      result: {
        percentComplete: 0,
        status: 'inProgress',
      },
    }
    const expected = failure('Contacts import summary response invalid format')
    const parsed = safeParseContactsImportStatus(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseCreateDistributionResponse', () => {
  const fixture = {
    result: {
      id: 'testId',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result.id)
    const parsed = safeParseCreateDistributionResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      meta: 'bad result',
    }
    const expected = failure(`Unable to parse Create Distribution Response`)
    const parsed = safeParseCreateDistributionResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when id is not in response', () => {
    const res = {
      result: {
        badProp: 'Test',
      },
    }
    const expected = failure(`Id missing in Create Distribution Response`)
    const parsed = safeParseCreateDistributionResponse(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseCreateReminderResponse', () => {
  const fixture = {
    result: {
      distributionId: 'testId',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result.distributionId)
    const parsed = safeParseCreateReminderResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      meta: 'bad result',
    }
    const expected = failure(`Unable to parse Create Reminder Response`)
    const parsed = safeParseCreateReminderResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when id is not in response', () => {
    const res = {
      result: {
        badProp: 'Test',
      },
    }
    const expected = failure(
      `distributionId missing in Create Reminder Response`
    )
    const parsed = safeParseCreateReminderResponse(res)
    expect(parsed).toStrictEqual(expected)
  })
})
