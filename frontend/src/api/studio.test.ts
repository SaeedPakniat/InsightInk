import { beforeEach, describe, expect, it, vi } from 'vitest'

import { clearCsrfToken } from './client'
import {
  createMyCreatorProfile,
  createMyIdea,
  createMySource,
  deleteMyIdea,
  getMyCreatorProfile,
  getMyIdea,
  getMyIdeas,
  getSources,
  publishMyIdea,
  updateMyCreatorProfile,
  updateMyIdea,
  withdrawMyIdea,
} from './studio'

describe('Creator Studio API', () => {
  beforeEach(() => {
    clearCsrfToken()
    vi.restoreAllMocks()
  })

  it('treats a missing self CreatorProfile as a valid null state', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'Not found.' }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(getMyCreatorProfile()).resolves.toBeNull()
  })

  it('loads the private Creator profile and source/Idea workspace endpoints', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 4,
            user_id: 8,
            bio_fa: '',
            bio_en: '',
            avatar: '',
            is_verified: false,
            created_at: '2026-11-07T08:00:00Z',
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: 10,
            language: 'en',
            title: 'Draft',
            body: 'Body',
            estimated_read_seconds: 60,
            status: 'draft',
            published_at: null,
            created_at: '2026-11-07T08:00:00Z',
            updated_at: '2026-11-07T08:00:00Z',
            source: 1,
            topics: [],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        ),
      )

    await getMyCreatorProfile()
    await getSources()
    await getMyIdeas()
    await getMyIdea(10)

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/me/creator/',
      '/api/v1/sources/',
      '/api/v1/me/ideas/',
      '/api/v1/me/ideas/10/',
    ])
  })

  it('creates and updates the CreatorProfile through CSRF-protected JSON', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'creator-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockImplementation(
        async () =>
          new Response(
            JSON.stringify({
              id: 4,
              user_id: 8,
              bio_fa: 'فا',
              bio_en: 'English bio',
              avatar: '',
              is_verified: false,
              created_at: '2026-11-07T08:00:00Z',
            }),
            {
              status: 200,
              headers: { 'content-type': 'application/json' },
            },
          ),
      )

    await createMyCreatorProfile({
      bio_fa: 'فا',
      bio_en: 'English bio',
    })
    await updateMyCreatorProfile({
      bio_fa: 'فا',
      bio_en: 'English bio',
    })

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/me/creator/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    })
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'PATCH',
      credentials: 'include',
    })
    expect(new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('X-CSRFToken')).toBe(
      'creator-csrf',
    )
  })

  it('creates and edits only the draft fields supplied by Studio', async () => {
    const draft = {
      id: 10,
      language: 'en',
      title: 'Draft',
      body: 'Body',
      estimated_read_seconds: 60,
      status: 'draft',
      published_at: null,
      created_at: '2026-11-07T08:00:00Z',
      updated_at: '2026-11-07T08:00:00Z',
      source: 1,
      topics: [2],
    }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'draft-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockImplementation(
        async () =>
          new Response(JSON.stringify(draft), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      )

    const payload = {
      language: 'en',
      title: 'Draft',
      body: 'Body',
      estimated_read_seconds: 60,
      source: 1,
      topics: [2],
    }

    await createMyIdea(payload)
    await updateMyIdea(10, payload)

    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual(payload)
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual(payload)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/me/ideas/')
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/v1/me/ideas/10/')
  })

  it('creates custom Sources through the Creator-only endpoint', async () => {
    const created = {
      id: 91,
      type: 'website',
      title: 'The Bitter Lesson',
      original_creator_text: 'Rich Sutton',
      language: 'en',
      external_url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
      cover: '',
    }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'source-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(created), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      )

    const payload = {
      type: 'website' as const,
      title: 'The Bitter Lesson',
      original_creator_text: 'Rich Sutton',
      language: 'en',
      external_url: 'http://www.incompleteideas.net/IncIdeas/BitterLesson.html',
    }

    await expect(createMySource(payload)).resolves.toEqual(created)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/me/sources/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify(payload),
    })
  })

  it('withdraws a published Idea through the dedicated no-payload endpoint', async () => {
    const withdrawn = {
      id: 10,
      language: 'en',
      title: 'Published Idea',
      body: 'Body',
      estimated_read_seconds: 60,
      status: 'withdrawn',
      published_at: '2026-11-07T09:00:00Z',
      created_at: '2026-11-07T08:00:00Z',
      updated_at: '2026-11-07T10:00:00Z',
      source: 1,
      topics: [],
    }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'withdraw-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(withdrawn), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    await expect(withdrawMyIdea(10)).resolves.toEqual(withdrawn)
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/me/ideas/10/withdraw/')
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined()
  })

  it('publishes with the dedicated no-payload endpoint and deletes drafts explicitly', async () => {
    const published = {
      id: 10,
      language: 'en',
      title: 'Draft',
      body: 'Body',
      estimated_read_seconds: 60,
      status: 'published',
      published_at: '2026-11-07T09:00:00Z',
      created_at: '2026-11-07T08:00:00Z',
      updated_at: '2026-11-07T09:00:00Z',
      source: 1,
      topics: [],
    }
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ csrfToken: 'publish-csrf' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(published), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))

    await publishMyIdea(10)
    await deleteMyIdea(11)

    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/me/ideas/10/publish/')
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      credentials: 'include',
    })
    expect(fetchMock.mock.calls[1]?.[1]?.body).toBeUndefined()
    expect(fetchMock.mock.calls[2]?.[0]).toBe('/api/v1/me/ideas/11/')
    expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({
      method: 'DELETE',
      credentials: 'include',
    })
  })
})
