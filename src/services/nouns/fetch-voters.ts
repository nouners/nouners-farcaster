import { Query, Delegate as Voter } from '@nekofar/nouns/subgraphs'
import { gql, GraphQLClient } from 'graphql-request'
import { pipe, uniqueBy } from 'remeda'

interface Result {
  voters: Voter[]
}

/**
 * Represents a GraphQL query to retrieve a list of votes.
 * @param skip - The number of items to skip in the query results.
 * @param first - The maximum number of items to return in the query results.
 * @param startBlock - The minimum block number to filter results.
 * @returns - The GraphQL query string.
 */
const getVotesQuery = (skip: number, first: number, startBlock: number) => gql`
  query {
    votes(
      skip: ${skip}
      first: ${first}
      orderBy: blockNumber
      orderDirection: desc
      where: {
        blockNumber_gte: ${startBlock}
      }
      subgraphError: deny
    ) {
      voter {
        id
      }
    }
  }
`

/**
 * Fetches unique voters within a certain block range using a GraphQL client.
 * @param env - The environment object.
 * @param startBlock - The minimum block number to filter results.
 * @returns - A promise that resolves to an array of unique voters.
 */
export async function fetchVoters(
  env: Env,
  startBlock: number,
): Promise<Result> {
  const { NOUNS_SUBGRAPH_URL: subgraphUrl } = env

  const first = 1000
  let skip = 0
  let shouldContinueFetching = true

  const client = new GraphQLClient(subgraphUrl, {
    errorPolicy: 'all',
    fetch,
  })

  const allVoters: Voter[] = []

  while (shouldContinueFetching) {
    try {
      const query = getVotesQuery(skip, first, startBlock)
      const { votes } = await client.request<Query>(query)
      shouldContinueFetching = votes.length > 0

      if (shouldContinueFetching) {
        allVoters.push(...votes.map((vote) => vote.voter))
        skip += first
      }
    } catch (error) {
      console.error('Error fetching voters:', error)
      shouldContinueFetching = false
    }
  }

  const uniqueVoters = pipe(
    allVoters,
    uniqueBy((voter) => voter.id),
  )

  return { voters: uniqueVoters }
}
