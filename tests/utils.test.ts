import { describe, it, expect } from 'vitest'
import {
  success,
  failure,
  safeParseBearerToken,
  safeParseTestResponse,
} from '../src/utils'

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

describe('safeParseTestResponse', () => {
  const fixture = {
    result: {
      userId: 'testUser',
    },
  }

  it('should pass with correct data', () => {
    const res = fixture
    const expected = success(undefined)
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
