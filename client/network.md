# Road Map

## V1.0
- Ping/Pong
- Peer Management
- Multiple Miner Support
- Network Times
- Difficulty Managment

## V2.0

- Network Testing with stats
- Uncles

# Messages

## Peer

Not v1

## Connection

Not v1 - Check connections are alive

### Ping/Pong

## Object

V1 MVP!

### Publish
Here is an item I think you might be interested in

```js
{
  type: 'publish',
  hash: '#'
}
```

### Request
Please send me this object
Once validated I will publish rumored object

```js
{
  type: 'request',
  hash: '#'
}
```

### Content
Here is the content of an object

```js
{
  type: 'content',
  hash: '#',
  object: {},
  signature: '#',
  user: ''
}
```

Once recieved validate, then publish to others

## Network
Probably don't need network ones, on a new connection, publish your head #

### Get Head

Not sure needed for v1

{
  type: 'gethead'
}

### Head

Just respond with publish #

{
  type: 'head',
  head: '#'
}

# Block

{
  previous: '#',
  nonce: 69,
  actions: [
    '#'
  ]
}

# Action
{
  msg: {
    type: "register-user",
    key: "035fbaa4242111bef266db8d188d1365cdb7eb65307f9bcb11a2f859f3d1bd69e1"
  },
  hash: '#',
  signature: '#',
  user: 'ENV'
}