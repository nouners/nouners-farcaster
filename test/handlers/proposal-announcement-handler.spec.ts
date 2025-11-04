import { describe, expect, it, beforeEach, vi } from 'vitest'
import { map } from 'remeda'

const getProposalsMock = vi.fn()
const createCastMock = vi.fn()
const resolveProposalBaseUrlMock = vi.fn()

vi.mock('@/services/nouns/get-proposals', () => ({
  getProposals: getProposalsMock,
}))

vi.mock('@/services/warpcast/create-cast', () => ({
  createCast: createCastMock,
}))

vi.mock('@/utilities/formatters/proposal-link', async () => {
  const actual = await vi.importActual<
    typeof import('@/utilities/formatters/proposal-link')
  >('@/utilities/formatters/proposal-link')

  return {
    ...actual,
    resolveProposalBaseUrl: resolveProposalBaseUrlMock,
  }
})

// Import after mocks so the handler under test uses the mocked dependencies.
import { proposalAnnouncementHandler } from '@/handlers/proposal-announcement-handler'

const PROPOSAL_CHECKPOINT_KEY = 'latest-announced-proposal-id'

interface MockProposal {
  id: number
  title: string
}

function createMemoryKV(initial: Record<string, unknown> = {}) {
  const store = new Map<string, string>()
  const gets: Array<{ key: string }> = []
  const puts: Array<{ key: string; value: string }> = []

  for (const [key, value] of Object.entries(initial)) {
    store.set(key, JSON.stringify(value))
  }

  const kv = {
    async get<TValue = unknown>(key: string, options?: { type?: 'json' }) {
      gets.push({ key })
      const value = store.get(key)

      if (value === undefined) {
        return null
      }

      if (options?.type === 'json') {
        return JSON.parse(value) as TValue
      }

      return value as TValue
    },
    async put(key: string, value: string) {
      puts.push({ key, value })
      store.set(key, value)
    },
  }

  return {
    kv: kv as unknown as KVNamespace,
    gets,
    puts,
    store,
  }
}

function createEnv(kv: KVNamespace): Env {
  return {
    KV: kv,
    QUEUE: {} as unknown as Queue,
    WARPCAST_BASE_URL: 'https://warpcast.test',
    NOUNS_SUBGRAPH_URL: 'https://subgraph.test',
    NEYNAR_API_URL: 'https://neynar.test',
    LOG_LEVEL: 'debug',
    PROPOSAL_BASE_URL: 'https://nouners.test/proposals',
    WARPCAST_ACCESS_TOKEN: 'token',
    WARPCAST_API_KEY: 'api-key',
    ALCHEMY_API_KEY: 'alchemy-key',
    NEYNAR_API_KEY: 'neynar-key',
    NODE_ENV: 'test',
  }
}

function makeProposal(id: number, title: string): MockProposal {
  return { id, title }
}

describe('proposalAnnouncementHandler', () => {
  beforeEach(() => {
    getProposalsMock.mockReset()
    createCastMock.mockReset()
    resolveProposalBaseUrlMock.mockReset()
    resolveProposalBaseUrlMock.mockReturnValue('https://nouners.test/proposals')
  })

  it('skips casting when KV already tracks the latest proposal id', async () => {
    const memory = createMemoryKV({ [PROPOSAL_CHECKPOINT_KEY]: 5 })
    const env = createEnv(memory.kv)

    getProposalsMock.mockResolvedValue({
      proposals: [makeProposal(4, 'Four'), makeProposal(5, 'Five')],
    })

    await proposalAnnouncementHandler(env)

    expect(createCastMock).not.toHaveBeenCalled()
    expect(memory.puts).toHaveLength(0)
  })

  it('announces newer proposals and advances the persisted checkpoint', async () => {
    const memory = createMemoryKV({ [PROPOSAL_CHECKPOINT_KEY]: 1 })
    const env = createEnv(memory.kv)

    getProposalsMock.mockResolvedValue({
      proposals: [
        makeProposal(1, 'Genesis'),
        makeProposal(2, 'Second'),
        makeProposal(3, 'Third'),
      ],
    })

    await proposalAnnouncementHandler(env)

    expect(createCastMock).toHaveBeenCalledTimes(2)

    const firstCall = createCastMock.mock.calls[0]!
    const secondCall = createCastMock.mock.calls[1]!

    expect(firstCall[0]).toBe(env)
    expect(firstCall[1]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining('Second'),
      }),
    )
    expect(firstCall[1]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining('https://nouners.test/proposals/2'),
      }),
    )

    expect(secondCall[1]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining('Third'),
      }),
    )
    expect(secondCall[1]).toEqual(
      expect.objectContaining({
        text: expect.stringContaining('https://nouners.test/proposals/3'),
      }),
    )

    expect(memory.puts.at(-1)).toEqual({
      key: PROPOSAL_CHECKPOINT_KEY,
      value: JSON.stringify(3),
    })
  })

  it('announces every proposal on the first run when no checkpoint exists', async () => {
    const memory = createMemoryKV()
    const env = createEnv(memory.kv)

    getProposalsMock.mockResolvedValue({
      proposals: [makeProposal(7, 'Seven'), makeProposal(8, 'Eight')],
    })

    await proposalAnnouncementHandler(env)

    expect(createCastMock).toHaveBeenCalledTimes(2)
    expect(map(createCastMock.mock.calls, ([, payload]) => payload.text)).toEqual([
      expect.stringContaining('Seven'),
      expect.stringContaining('Eight'),
    ])
    expect(memory.puts.at(-1)).toEqual({
      key: PROPOSAL_CHECKPOINT_KEY,
      value: JSON.stringify(8),
    })
  })

  it('processes unseen proposals in ascending order', async () => {
    const memory = createMemoryKV({ [PROPOSAL_CHECKPOINT_KEY]: 10 })
    const env = createEnv(memory.kv)

    getProposalsMock.mockResolvedValue({
      proposals: [
        makeProposal(8, 'Older'),
        makeProposal(11, 'Eleven'),
        makeProposal(12, 'Twelve'),
        makeProposal(9, 'Nine'),
      ],
    })

    await proposalAnnouncementHandler(env)

    expect(createCastMock).toHaveBeenCalledTimes(2)
    expect(map(createCastMock.mock.calls, ([, payload]) => payload.text)).toEqual([
      expect.stringContaining('Eleven'),
      expect.stringContaining('Twelve'),
    ])
    expect(memory.puts.at(-1)).toEqual({
      key: PROPOSAL_CHECKPOINT_KEY,
      value: JSON.stringify(12),
    })
  })

  it('bubbles errors when casting fails', async () => {
    const memory = createMemoryKV({ [PROPOSAL_CHECKPOINT_KEY]: 2 })
    const env = createEnv(memory.kv)

    getProposalsMock.mockResolvedValue({
      proposals: [makeProposal(3, 'Third')],
    })
    const failure = new Error('warpcast down')
    createCastMock.mockRejectedValue(failure)

    await expect(proposalAnnouncementHandler(env)).rejects.toThrow(failure)

    expect(memory.puts).toHaveLength(0)
  })
})
