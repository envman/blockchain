$(() => {
  $('.create-btn').click(() => {
    const type = $('.trade option:selected').text()
    const asset = $('.asset option:selected').text()
    const amount = $('.amount').val()

    const action = {
      type,
      asset,
      amount
    }

    console.log('trade', action)

    return fetch(`${window.location.origin}/action`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify(action)
    }).then(() => {

    })
  })

  $('.send-btn').click(() => {
    const asset = $('.asset').val()
    const to = $('.to').val()

    const action = {
      type: 'transaction',
      to: to,
      input: {
        type: 'asset',
        hash: asset,
      },
    }

    console.log('send asset', action)

    return fetch(`${window.location.origin}/action`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify(action)
    }).then(() => {

    })
  })

  $('.send-cash-btn').click(() => {
    const amount = $('.send-amount').val()
    const to = $('.send-to').val()

    const action = {
      type: 'transaction',
      to: to,
      input: {
        type: 'cash',
        amount,
      },
    }

    console.log('send asset', action)

    return fetch(`${window.location.origin}/action`, {
      method: 'POST',
      headers: {
        "Content-Type": 'application/json'
      },
      body: JSON.stringify(action)
    }).then(() => {

    })
  })

  const update = () => {
    fetch(`${window.location.origin}/view`, {})
      .then(res => res.json())
      .then(x => {
        const { trades } = x.game
        
        $('.turn').text(`Turn: ${x.game.turn}`)
        $('.cash').html(x.user.cash)
        $('.my-address').text(x.user.key)

        $('.items').empty()
        if (x.user.assets) {
          for (let hash of x.user.assets) {
            const asset = x.game.assets[hash]
            $('.items').append(`<div>${asset.type}:${asset.name}:<div>${hash}</div></div>`)
          }
        }
        
        $('.trade-list').empty()

        for (let { trade, amount, asset, user } of trades) {
          $('.trade-list').append(`<div>${trade}, ${amount}, ${asset}</div>`)
        }
      })
      .then(_ => {
        setTimeout(update, 5000)
      })
      .catch(err => {
        console.error(err)
        setTimeout(update, 5000)
      })
  }

  update()
})