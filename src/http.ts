declare const InstanceUrl: string
declare const AccessToken: string

const baseUrl = `https://${InstanceUrl}`
const baseHeaders = {
  Authorization: `Bearer ${AccessToken}`,
  Accept: 'application/json, text/plain, */*',
}

export function get(input: string): Promise<Response> {
  let url
  if (input.startsWith('https://')) {
    url = input
  } else {
    url = baseUrl + input
  }
  console.debug(`[GET] ${url}`)
  return fetch(url, {
    headers: {
      ...baseHeaders,
    },
  })
}

export function post(
  input: string,
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
): Promise<Response> {
  let url
  if (input.startsWith('https://')) {
    url = input
  } else {
    url = baseUrl + input
  }
  console.debug(
    `[POST] ${url} ${JSON.stringify(body)} ${JSON.stringify(headers)}`,
  )
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...baseHeaders,
      ...headers,
    },
    body: body ? JSON.stringify(body) : null,
  })
}

interface link {
  type: 'next' | 'prev'
  url: string
}

export async function getList<T>(
  url: string,
  breakTest?: (list: T[], newList: T[], next: link) => boolean,
): Promise<T[]> {
  const list: T[] = []
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const resp = await get(url)
    const json = (await resp.json()) as T[]
    if (resp.ok) {
      list.push(...json)
    } else {
      throw new Error(JSON.stringify(json))
    }
    const _link = resp.headers.get('link')

    const links =
      _link
        ?.split(',')
        .map((s) => s.split(';').map((ss) => ss.trim()))
        .map((item) => {
          const [u, t] = item
          const url = u.substring(u.indexOf('<') + 1, u.lastIndexOf('>'))
          const type = t.substring(t.indexOf('rel="') + 5, t.lastIndexOf('"'))
          return {
            type,
            url,
          } as link
        }) ?? []
    const next = links.filter((item) => item.type === 'next')[0]
    if (next) {
      if (typeof breakTest === 'function') {
        if (breakTest(list, json, next)) {
          console.info('[getList] break')
          break
        }
      }
      url = next.url
    } else {
      break
    }
  }
  return list
}

export async function postStatus(
  status: string,
  options: {
    media_ids?: string[]
    poll?: Poll | null
    in_reply_to_id?: string
    sensitive?: boolean
    spoiler_text?: string
    visibility?: 'public' | 'unlisted' | 'private' | 'direct'
    scheduled_at?: string
    language?: string
    'Idempotency-Key'?: string
  },
): Promise<Status | ScheduledStatus> {
  const resp = await post(
    '/api/v1/statuses',
    {
      status,
      poll: null,
      sensitive: false,
      spoiler_text: '',
      media_ids: [],
      in_reply_to_id: null,
      visibility: 'public',
      ...options,
    },
    {
      'Idempotency-Key': options['Idempotency-Key']
        ? options['Idempotency-Key']
        : await sha1sum(status + JSON.stringify(options)),
    },
  )
  const json = await resp.json()
  if (resp.ok) {
    return json as Status | ScheduledStatus
  } else {
    throw new Error(JSON.stringify(json))
  }
}

async function sha1sum(input: string) {
  const enc = new TextEncoder()
  const arrayBuffer = enc.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-1', arrayBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
