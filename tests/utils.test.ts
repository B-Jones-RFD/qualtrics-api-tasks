import { describe, it, expect } from 'vitest'
import { success, failure } from '../src/utils'
import {
  safeParseWhoAmI,
  safeParseStartFileExportResponse,
  safeParseFileProgressResponse,
  safeParseCreateMailingListResponse,
  safeParseStartContactsImportResponse,
  safeParseContactsImportStatus,
  safeParseCreateDistributionResponse,
  safeParseCreateReminderResponse,
  safeParseListLibraryMessages,
  safeParseListDistributions,
  safeParseGetDistribution,
} from '../src/utils/parsers'

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
    const expected = failure('Unable to parse File Progress Response')
    const parsed = safeParseFileProgressResponse(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('normalises a null or missing fileId to null while in progress', () => {
    const absent = { result: { percentComplete: 0, status: 'inProgress' } }
    expect(safeParseFileProgressResponse(absent)).toStrictEqual(
      success({ percentComplete: 0, status: 'inProgress', fileId: null })
    )
    const nul = {
      result: { fileId: null, percentComplete: 0, status: 'failed' },
    }
    expect(safeParseFileProgressResponse(nul)).toStrictEqual(
      success({ percentComplete: 0, status: 'failed', fileId: null })
    )
  })

  it('should fail with missing props', () => {
    const res = { result: { fileId: 'f', percentComplete: 0 } }
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
    const expected = failure('Unable to parse Start Export Response')
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

describe('safeParseWhoAmI', () => {
  const fixture = {
    result: {
      userId: 'UR_1',
      brandId: 'brand',
      userName: 'user@example.com',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result)
    const parsed = safeParseWhoAmI(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      result: 'bad result',
    }
    const expected = failure('Incorrect whoami response format')
    const parsed = safeParseWhoAmI(res)
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
    const expected = failure('Start Contacts Import Response invalid format')
    const parsed = safeParseStartContactsImportResponse(res)
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
    const expected = failure(`Unable to parse Contacts Import Status Response`)
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
    const expected = failure('Contacts Import Status Response invalid format')
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

describe('safeParseListLibraryMessages', () => {
  const fixture = {
    result: {
      elements: [],
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success({ elements: [], nextPage: null })
    const parsed = safeParseListLibraryMessages(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      meta: 'bad result',
    }
    const expected = failure(`Unable to parse List Library Messages response`)
    const parsed = safeParseListLibraryMessages(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when id is not in response', () => {
    const res = {
      result: {
        badProp: 'Test',
      },
    }
    const expected = failure(
      `elements missing in List Library Messages response`
    )
    const parsed = safeParseListLibraryMessages(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseGetDistribution', () => {
  const fixture = {
    result: {
      id: 'testID',
      stats: {},
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(fixture.result)
    const parsed = safeParseGetDistribution(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      meta: 'bad result',
    }
    const expected = failure(`Unable to parse Get Distribution response`)
    const parsed = safeParseGetDistribution(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when id is not in response', () => {
    const res = {
      result: {
        badProp: 'Test',
      },
    }
    const expected = failure(`Properties missing in Get Distribution response`)
    const parsed = safeParseGetDistribution(res)
    expect(parsed).toStrictEqual(expected)
  })
})

describe('safeParseListDistributions', () => {
  const fixture = {
    result: {
      elements: [],
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success({ elements: [], nextPage: null })
    const parsed = safeParseListDistributions(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when response is incorrect type', () => {
    const res = {
      meta: 'bad result',
    }
    const expected = failure(`Unable to parse List Distributions response`)
    const parsed = safeParseListDistributions(res)
    expect(parsed).toStrictEqual(expected)
  })

  it('should fail when id is not in response', () => {
    const res = {
      result: {
        badProp: 'Test',
      },
    }
    const expected = failure(`elements missing in List Distributions response`)
    const parsed = safeParseListDistributions(res)
    expect(parsed).toStrictEqual(expected)
  })
})
