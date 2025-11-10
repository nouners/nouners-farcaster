import { Delegate, Query } from '@nekofar/nouns/subgraphs'
import { gql, GraphQLClient } from 'graphql-request'

interface Result {
  delegates: Delegate[]
}

/**
 * Query to fetch delegates with pagination and sorting options.
 * @param skip - Number of items to skip.
 * @param first - Number of items to fetch.
 * @returns - Apollo GraphQL query document node.
 */
const getDelegatesQuery = (skip: number, first: number) => gql`
  query{
    delegates(
      skip: ${skip}
      first: ${first}
      orderBy: delegatedVotes
      orderDirection: desc
      where: { and: [{ delegatedVotes_gt: 0 }] }
      subgraphError: deny
    ) {
      id
      delegatedVotes
      nounsRepresented(
        skip: 0
        first: 1000
        orderBy: id
        orderDirection: asc
        where: {}
      ) {
        id
      }
    }
  }
`

/**
 * Fetches delegates from a GraphQL API.
 * @param env - The environment object containing the API URL.
 * @returns - A promise that resolves to an array of delegates.
 */
export async function fetchDelegates(env: Env): Promise<Result> {
  const { NOUNS_SUBGRAPH_URL: subgraphUrl } = env

  const first = 1000
  let skip = 0
  let allDelegates: Delegate[] = []
  let shouldContinueFetching = true

  const client = new GraphQLClient(subgraphUrl, {
    errorPolicy: 'all',
    fetch,
  })

  while (shouldContinueFetching) {
    try {
      const query = getDelegatesQuery(skip, first)
      const { delegates } = await client.request<Query>(query)
      shouldContinueFetching = delegates.length > 0

      if (shouldContinueFetching) {
        allDelegates = [...allDelegates, ...delegates]
        skip += first
      }
    } catch (error) {
      console.error('Error fetching delegates:', error)
      shouldContinueFetching = false
    }
  }

  return { delegates: allDelegates }
}
