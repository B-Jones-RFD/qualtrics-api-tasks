import type {
  ActionFactory,
  Distribution,
  GetNextPageOptions,
  LibraryMessage,
  ListAllOptions,
  ListDistributionsOptions,
  ListLibraryMessagesOptions,
  PagedIterator,
  PagedResponse,
  RequestOptions,
  Result,
} from '../types'
import { toFailure } from '../errors'
import { withRetry } from '../retry'
import { createConnectionContext } from '../context'
import { failure, success } from '../utils'
import { execute } from '../qualtrics'
import {
  safeParseListDistributions,
  safeParseListLibraryMessages,
} from '../utils/parsers'
import { listDistributions } from './distributions/listDistributions'
import { listLibraryMessages } from './listLibraryMessages'

type PageParser<T> = (response: unknown) => Result<PagedResponse<T>>

/**
 * Fetches the page a previous result's `nextPage` points at. The link must
 * be on the connection's own datacenter host; anything else fails with
 * `UNKNOWN` without a request being made.
 */
function nextPageFactory<T>(
  action: string,
  parse: PageParser<T>
): ActionFactory<GetNextPageOptions, PagedResponse<T>> {
  return (
      connectionOptions,
      context = createConnectionContext(connectionOptions)
    ) =>
    ({ nextPage, ...request }) =>
      withRetry(connectionOptions.retry, request.signal, async () => {
        try {
          let url: URL
          try {
            url = new URL(nextPage)
          } catch {
            return failure(
              `Error in ${action}: nextPage is not a URL (got '${nextPage}')`,
              'UNKNOWN'
            )
          }
          const host = `${connectionOptions.datacenterId}.qualtrics.com`
          if (url.protocol !== 'https:' || url.host.toLowerCase() !== host)
            return failure(
              `Error in ${action}: refusing to follow nextPage on '${url.host}'; expected '${host}'`,
              'UNKNOWN'
            )
          const response = await execute({
            connectionOptions,
            context,
            request,
            route: url.pathname + url.search,
          })
          return parse(response)
        } catch (error) {
          return toFailure(action, error)
        }
      })
}

async function* iteratePages<T>(
  first: () => Promise<Result<PagedResponse<T>>>,
  next: (nextPage: string) => Promise<Result<PagedResponse<T>>>,
  maxPages: number | undefined
): AsyncGenerator<Result<PagedResponse<T>>, void, undefined> {
  const limit = maxPages === undefined ? Infinity : Math.max(0, maxPages)
  if (limit === 0) return
  let page = await first()
  yield page
  let count = 1
  while (page.success && page.data.nextPage && count < limit) {
    page = await next(page.data.nextPage)
    yield page
    count++
  }
}

async function collectPages<T>(
  action: string,
  pages: AsyncGenerator<Result<PagedResponse<T>>, void, undefined>
): Promise<Result<T[]>> {
  const items: T[] = []
  let pageNumber = 0
  for await (const page of pages) {
    pageNumber++
    if (!page.success)
      return pageNumber === 1
        ? page
        : {
            ...page,
            error: `Error in ${action}: page ${pageNumber} failed after ${items.length} items: ${page.error}`,
          }
    items.push(...page.data.elements)
  }
  return success(items)
}

// ---------------------------------------------------------------------------
// Distributions
// ---------------------------------------------------------------------------

/**
 * Get Next Page of Distributions
 *
 * Follows the `nextPage` link from {@link listDistributions}.
 */
export const getNextDistributionsPage = nextPageFactory<Distribution>(
  'getNextDistributionsPage',
  safeParseListDistributions
)

/**
 * Iterate Distributions
 *
 * Yields one {@link PagedResponse} result per request until Qualtrics reports
 * no more pages, `maxPages` is reached, or a page fails (the failure is
 * yielded, then iteration ends). Never throws.
 */
export const iterateDistributions: (
  ...args: Parameters<typeof listDistributions>
) => PagedIterator<ListDistributionsOptions, Distribution> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  ({ maxPages, ...options }) => {
    const first = listDistributions(connectionOptions, context)
    const next = getNextDistributionsPage(connectionOptions, context)
    const request: RequestOptions = {
      bearerToken: options.bearerToken,
      timeout: options.timeout,
      signal: options.signal,
    }
    return iteratePages(
      () => first(options),
      (nextPage) => next({ nextPage, ...request }),
      maxPages
    )
  }

/**
 * List All Distributions
 *
 * Collects every page from {@link listDistributions} into one array. A failed
 * page fails the whole call.
 */
export const listAllDistributions: ActionFactory<
  ListAllOptions<ListDistributionsOptions>,
  Distribution[]
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  (options) =>
    collectPages(
      'listAllDistributions',
      iterateDistributions(connectionOptions, context)(options)
    )

// ---------------------------------------------------------------------------
// Library messages
// ---------------------------------------------------------------------------

/**
 * Get Next Page of Library Messages
 *
 * Follows the `nextPage` link from {@link listLibraryMessages}.
 */
export const getNextLibraryMessagesPage = nextPageFactory<LibraryMessage>(
  'getNextLibraryMessagesPage',
  safeParseListLibraryMessages
)

/**
 * Iterate Library Messages
 *
 * Yields one {@link PagedResponse} result per request until Qualtrics reports
 * no more pages, `maxPages` is reached, or a page fails. Never throws.
 */
export const iterateLibraryMessages: (
  ...args: Parameters<typeof listLibraryMessages>
) => PagedIterator<ListLibraryMessagesOptions, LibraryMessage> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  ({ maxPages, ...options }) => {
    const first = listLibraryMessages(connectionOptions, context)
    const next = getNextLibraryMessagesPage(connectionOptions, context)
    const request: RequestOptions = {
      bearerToken: options.bearerToken,
      timeout: options.timeout,
      signal: options.signal,
    }
    return iteratePages(
      () => first(options),
      (nextPage) => next({ nextPage, ...request }),
      maxPages
    )
  }

/**
 * List All Library Messages
 *
 * Collects every page from {@link listLibraryMessages} into one array. A
 * failed page fails the whole call.
 */
export const listAllLibraryMessages: ActionFactory<
  ListAllOptions<ListLibraryMessagesOptions>,
  LibraryMessage[]
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  (options) =>
    collectPages(
      'listAllLibraryMessages',
      iterateLibraryMessages(connectionOptions, context)(options)
    )
