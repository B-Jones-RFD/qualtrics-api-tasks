import { describe, it, expect } from 'vitest'
import { success, failure } from '../src/utils'
import {
  safeParseBearerToken,
  safeParseTestResponse,
  safeParseStartFileExportResponse,
  safeParseFileProgressResponse,
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
