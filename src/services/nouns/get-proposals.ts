import { gql, GraphQLClient } from 'graphql-request'
import { Proposal, Query } from '@nekofar/nouns/subgraphs'

interface Result {
  proposals: Proposal[]
}

/**
 * Returns a GraphQL query to fetch proposals
 * @param skip - The number of items to skip
 * @param first - The number of items to retrieve
 * @returns The GraphQL query string
 */
const getProposalsQuery = (skip: number, first: number) => gql`
  {
    proposals(
      skip: ${skip}
      first: ${first}
      orderBy: createdBlock
      orderDirection: asc
      where: {}
      subgraphError: deny
    ) {
      id
      proposer {
        id
      }
      createdTimestamp
      createdBlock
      startBlock
      endBlock
      title
      status
      votes(skip: 0, first: 1000, orderBy: id, orderDirection: asc, where: {}) {
        voter {
          id
        }
        blockNumber
      }
    }
  }
`

/**
 * Retrieves a list of proposals from a given environment.
 * @param env - The environment object containing the necessary information.
 * @returns - An object containing the list of proposals.
 */
export async function getProposals(env: Env): Promise<Result> {
  const { NOUNS_SUBGRAPH_URL: subgraphUrl } = env

  const limit = 1000
  let offset = 0
  let allProposals: Proposal[] = []
  let hasMoreProposals = false

  const client = new GraphQLClient(subgraphUrl, {
    errorPolicy: 'all',
    fetch,
  })

  do {
    const query = getProposalsQuery(offset, limit)
    const { proposals } = await client.request<Query>(query)

    allProposals = [...allProposals, ...proposals]
    offset += limit
    hasMoreProposals = proposals.length > 0
  } while (hasMoreProposals)

  return { proposals: allProposals }
}
