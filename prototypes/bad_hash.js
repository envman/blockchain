// h9883f61d9703d25c9bee93c6f813c93d2fc31c0bd66eec37af0abf9ed92e7030
// 0003efd952247fe67fcc127b7ea4a743fb5e2c79a71eee069282d75301cad23c 

const msg = {
  "type":"block",
  "previous":"0000000000000000000000000000000000000000000000000000000000000000",
  "difficulty":3,
  "nonce":42,
  "actions":[{"type":"transaction","to":"03e16bf51141c0c8a530b84c474f4e4a19ddad003142ccb497913fe6039bd5189c","input":{"type":"cash","amount":1},"stamp":"XxBz-17HL","hash":"bb17ea924971f7abbbb48f32dcedcd2c26692acea4ebc85a5fb4e54cfcb77080","user":"03e16bf51141c0c8a530b84c474f4e4a19ddad003142ccb497913fe6039bd5189c"}],
  // "hash":"0003efd952247fe67fcc127b7ea4a743fb5e2c79a71eee069282d75301cad23c"
} 

const sha256 = require('sha256')

const h = obj => sha256.x2(JSON.stringify(obj))

console.log('actual', h(msg))

// delete msg.hash
// console.log('deleted', h(msg))