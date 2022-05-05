declare const MatrixBaseUrl: string
declare const MatrixAccessToken: string
declare const MatrixUserId: string
declare const MatrixRoomId: string
declare const AuthorizationToken: string

interface crowdinMessage {
  message: string
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.headers.get('Authorization') === `bearer ${AuthorizationToken}`) {
    const message = await request.json<crowdinMessage>()

    const content = {
      body: message.message,
      msgtype: 'm.text',
    }

    // Sending events to a room
    // https://spec.matrix.org/v1.2/client-server-api/#put_matrixclientv3roomsroomidsendeventtypetxnid
    const resp = await fetch(
      `${MatrixBaseUrl}/_matrix/client/v3/rooms/${MatrixRoomId}/send/m.room.message/`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${MatrixAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(content),
      },
    )
    if (resp.ok) {
      const data = await resp.json<{ event_id: string }>()
      return new Response(data.event_id, { status: 200 })
    } else {
      const data = await resp.text()
      console.error(data)
      return new Response(data, { status: 502 })
    }
  } else {
    return new Response('403 Forbiden', { status: 403 })
  }
}
