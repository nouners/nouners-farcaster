import { Account, Query } from '@nekofar/nouns/subgraphs'
import { gql, GraphQLClient } from 'graphql-request'

interface Result {
  accounts: Account[]
}

/**
 * Represents a GraphQL query to retrieve a list of accounts.
 * @param skip - The number of items to skip in the query results.
 * @param first - The maximum number of items to return in the query results.
 * @returns - The GraphQL query string.
 */
const getAccountsQuery = (skip: number, first: number) => gql`
  query{
    accounts(
      skip: ${skip}
      first: ${first}
      orderBy: tokenBalance
      orderDirection: desc
      where: {
        and: [
          {
            id_not_in: [
              "0x0bc3807ec262cb779b38d65b38158acc3bfede10"
              "0x0000000000000000000000000000000000000000"
              "0x18222a762bf67024193de25e1cdc7aa6e614c695"
            ]
          }
          {
            or: [{ tokenBalance_gt: 0 }]
          }
        ]
      }
    ) {
      id
      nouns {
        id
      }
    }
  }
`

/**
 * Fetches accounts using a GraphQL client and returns all the accounts.
 * @param env - The environment object.
 * @returns - A promise that resolves to an array of accounts.
 */
export async function fetchAccounts(env: Env): Promise<Result> {
  const { NOUNS_SUBGRAPH_URL: subgraphUrl } = env

  const first = 1000
  let skip = 0
  let allAccounts: Account[] = []
  let shouldContinueFetching = true

  const client = new GraphQLClient(subgraphUrl, {
    errorPolicy: 'all',
    fetch,
  })

  while (shouldContinueFetching) {
    try {
      const query = getAccountsQuery(skip, first)
      const { accounts } = await client.request<Query>(query)
      shouldContinueFetching = accounts.length > 0

      if (shouldContinueFetching) {
        allAccounts = [...allAccounts, ...accounts]
        skip += first
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
      shouldContinueFetching = false
    }
  }

  return { accounts: allAccounts }
}
